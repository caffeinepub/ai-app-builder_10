import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Migration "migration";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  // Types
  type Message = {
    role : { #user; #assistant };
    content : Text;
  };

  type Project = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : Text;
    outputType : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    generatedHTML : Text;
    conversationHistory : [Message];
  };

  module Project {
    public func compare(p1 : Project, p2 : Project) : Order.Order {
      Nat.compare(p1.id, p2.id);
    };
  };

  public type UserProfile = { name : Text };

  public type ProjectInput = {
    name : Text;
    description : Text;
    outputType : Text;
  };

  public type MessageInput = {
    projectId : Nat;
    message : Text;
    imageBase64 : ?Text;
  };

  // State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let projects = Map.empty<Nat, Project>();
  let apiKeys = Map.empty<Principal, Text>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextProjectId = 0;

  // Internal Helpers
  func getProjectInternal(id : Nat) : Project {
    switch (projects.get(id)) {
      case (null) { Runtime.trap("Project not found") };
      case (?p) { p };
    };
  };

  func ensureProjectOwner(project : Project, caller : Principal) {
    if (project.owner != caller) {
      Runtime.trap("Unauthorized: You are not the owner of this project");
    };
  };

  func getSystemPrompt(outputType : Text) : Text {
    switch (outputType) {
      case ("webpage") {
        "You are an expert web developer. Generate a complete, beautiful, self-contained single HTML file with embedded CSS and JavaScript. The HTML must be a full professional webpage with modern design, animations, and interactivity. Use CSS gradients, animations, hover effects, and responsive layout. Always respond with ONLY the complete HTML code starting with <!DOCTYPE html>, nothing else. No explanation, no markdown, no code fences.";
      };
      case ("presentation") {
        "You are an expert presentation designer. Generate a complete Reveal.js HTML presentation as a single self-contained HTML file. Include Reveal.js from CDN. Create visually stunning, professional slides with proper section structure, transitions, and embedded styles. Each slide should be a <section> tag inside <div class=\"reveal\"><div class=\"slides\">. Always respond with ONLY the complete HTML code starting with <!DOCTYPE html>, nothing else. No explanation, no markdown, no code fences.";
      };
      case _ {
        "You are an expert full-stack developer. Generate a complete, functional, self-contained single HTML file with embedded CSS and JavaScript that works as a fully interactive web application. Use modern UI patterns, beautiful design, and include all features requested. Make it production-quality with proper error handling and smooth interactions. Always respond with ONLY the complete HTML code starting with <!DOCTYPE html>, nothing else. No explanation, no markdown, no code fences.";
      };
    };
  };

  func escapeJson(s : Text) : Text {
    var result = "";
    for (c in s.chars()) {
      if (c == '\"') { result #= "\\\"" }
      else if (c == '\\') { result #= "\\\\" }
      else if (c == '\n') { result #= "\\n" }
      else if (c == '\r') { result #= "\\r" }
      else if (c == '\t') { result #= "\\t" }
      else { result #= Text.fromChar(c) };
    };
    result;
  };

  func buildMessagesJson(history : [Message], systemPrompt : Text) : Text {
    var msgs = "[{\"role\":\"system\",\"content\":\"" # escapeJson(systemPrompt) # "\"}";
    for (msg in history.vals()) {
      let roleStr = switch (msg.role) {
        case (#user) { "user" };
        case (#assistant) { "assistant" };
      };
      msgs #= ",{\"role\":\"" # roleStr # "\",\"content\":\"" # escapeJson(msg.content) # "\"}";
    };
    msgs # "]";
  };

  // Extract assistant content from OpenAI JSON response
  func extractAssistantContent(responseText : Text) : Text {
    let contentMarker = "\"content\":\"";
    let parts = responseText.split(#text(contentMarker)).toArray();
    if (parts.size() < 2) {
      return "Error: Could not parse AI response";
    };
    let lastPart = parts[parts.size() - 1];
    var result = "";
    var escaped = false;
    var done = false;
    for (c in lastPart.chars()) {
      if (not done) {
        if (escaped) {
          if (c == 'n') { result #= "\n" }
          else if (c == 't') { result #= "\t" }
          else if (c == 'r') { result #= "\r" }
          else { result #= Text.fromChar(c) };
          escaped := false;
        } else if (c == '\\') {
          escaped := true;
        } else if (c == '\"') {
          done := true;
        } else {
          result #= Text.fromChar(c);
        };
      };
    };
    if (result == "") { "Error: Empty AI response" } else { result };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };

  // Project CRUD
  public shared ({ caller }) func createProject(input : ProjectInput) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextProjectId;
    let project : Project = {
      id;
      owner = caller;
      name = input.name;
      description = input.description;
      outputType = input.outputType;
      createdAt = Time.now();
      updatedAt = Time.now();
      generatedHTML = "";
      conversationHistory = [];
    };
    projects.add(id, project);
    nextProjectId += 1;
    id;
  };

  public shared ({ caller }) func updateProject(id : Nat, input : ProjectInput) : async () {
    let project = getProjectInternal(id);
    ensureProjectOwner(project, caller);
    projects.add(id, {
      project with
      name = input.name;
      description = input.description;
      outputType = input.outputType;
      updatedAt = Time.now();
    });
  };

  public shared ({ caller }) func deleteProject(id : Nat) : async () {
    let project = getProjectInternal(id);
    ensureProjectOwner(project, caller);
    projects.remove(id);
  };

  public query ({ caller }) func getProject(projectId : Nat) : async Project {
    let project = getProjectInternal(projectId);
    ensureProjectOwner(project, caller);
    project;
  };

  public query ({ caller }) func getUserProjectIds() : async [Nat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    projects.entries().toArray().filter(func((_, p)) { p.owner == caller }).map(func((id, _)) { id });
  };

  public query ({ caller }) func getUserProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    projects.values().toArray().filter(func(p) { p.owner == caller }).sort();
  };

  // API Key Management
  public shared ({ caller }) func setApiKey(apiKey : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    apiKeys.add(caller, apiKey);
  };

  public query ({ caller }) func getApiKey() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    apiKeys.get(caller);
  };

  // AI Chat - makes actual HTTP outcall to OpenAI
  public shared ({ caller }) func sendMessageToAI(input : MessageInput) : async Project {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let project = getProjectInternal(input.projectId);
    ensureProjectOwner(project, caller);

    let apiKey = switch (apiKeys.get(caller)) {
      case (null) {
        Runtime.trap("No API key found. Please go to Settings and add your OpenAI API key.");
      };
      case (?k) { k };
    };

    // Build user message content
    let userContent = switch (input.imageBase64) {
      case (null) { input.message };
      case (?_) { input.message # " [User also attached an image for reference]" };
    };

    let userMessage : Message = { role = #user; content = userContent };
    let updatedHistory = project.conversationHistory.concat([userMessage]);

    // Save user message immediately
    projects.add(input.projectId, {
      project with
      conversationHistory = updatedHistory;
      updatedAt = Time.now();
    });

    // Build OpenAI request
    let systemPrompt = getSystemPrompt(project.outputType);
    let messagesJson = buildMessagesJson(updatedHistory, systemPrompt);
    let requestBody = "{\"model\":\"gpt-4o\",\"max_tokens\":16000,\"messages\":" # messagesJson # "}";

    let extraHeaders : [OutCall.Header] = [
      { name = "Authorization"; value = "Bearer " # apiKey },
    ];

    let responseText = await OutCall.httpPostRequest(
      "https://api.openai.com/v1/chat/completions",
      extraHeaders,
      requestBody,
      transform,
    );

    let assistantContent = extractAssistantContent(responseText);

    let assistantMessage : Message = { role = #assistant; content = assistantContent };
    let finalHistory = updatedHistory.concat([assistantMessage]);

    let isHtml = assistantContent.startsWith(#text("<!DOCTYPE"))
      or assistantContent.startsWith(#text("<html"))
      or assistantContent.startsWith(#text("<!doctype"));
    let newHTML = if (isHtml) { assistantContent } else { project.generatedHTML };

    let finalProject : Project = {
      project with
      generatedHTML = newHTML;
      conversationHistory = finalHistory;
      updatedAt = Time.now();
    };
    projects.add(input.projectId, finalProject);
    finalProject;
  };

  public query ({ caller }) func getGeneratedHTML(projectId : Nat) : async Text {
    let project = getProjectInternal(projectId);
    ensureProjectOwner(project, caller);
    project.generatedHTML;
  };

  // HTTP Outcall Transform
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
