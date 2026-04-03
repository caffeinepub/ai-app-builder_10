import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


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

  public type ProviderApiKeys = {
    openai : ?Text;
    anthropic : ?Text;
    google : ?Text;
  };

  // State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let projects = Map.empty<Nat, Project>();
  // Legacy single-key store (openai)
  let apiKeys = Map.empty<Principal, Text>();
  // Per-provider key stores
  let anthropicKeys = Map.empty<Principal, Text>();
  let googleKeys = Map.empty<Principal, Text>();
  // Active provider per user
  let activeProviders = Map.empty<Principal, Text>();
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

  func buildOpenAIMessagesJson(history : [Message], systemPrompt : Text) : Text {
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

  func buildAnthropicMessagesJson(history : [Message]) : Text {
    var msgs = "[";
    var first = true;
    for (msg in history.vals()) {
      let roleStr = switch (msg.role) {
        case (#user) { "user" };
        case (#assistant) { "assistant" };
      };
      if (not first) { msgs #= "," };
      msgs #= "{\"role\":\"" # roleStr # "\",\"content\":\"" # escapeJson(msg.content) # "\"}";
      first := false;
    };
    msgs # "]";
  };

  func buildGeminiContentsJson(history : [Message]) : Text {
    var contents = "[";
    var first = true;
    for (msg in history.vals()) {
      // Gemini uses "user" and "model" (not "assistant")
      let roleStr = switch (msg.role) {
        case (#user) { "user" };
        case (#assistant) { "model" };
      };
      if (not first) { contents #= "," };
      contents #= "{\"role\":\"" # roleStr # "\",\"parts\":[{\"text\":\"" # escapeJson(msg.content) # "\"}]}";
      first := false;
    };
    contents # "]";
  };

  // Extract assistant content from OpenAI JSON response
  func extractOpenAIContent(responseText : Text) : Text {
    let contentMarker = "\"content\":\"";
    let parts = responseText.split(#text(contentMarker)).toArray();
    if (parts.size() < 2) {
      return "Error: Could not parse OpenAI response";
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
    if (result == "") { "Error: Empty OpenAI response" } else { result };
  };

  // Extract content from Anthropic response: .content[0].text
  func extractAnthropicContent(responseText : Text) : Text {
    let textMarker = "\"text\":\"";
    let parts = responseText.split(#text(textMarker)).toArray();
    if (parts.size() < 2) {
      return "Error: Could not parse Anthropic response";
    };
    let afterText = parts[1];
    var result = "";
    var escaped = false;
    var done = false;
    for (c in afterText.chars()) {
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
    if (result == "") { "Error: Empty Anthropic response" } else { result };
  };

  // Extract content from Gemini response: .candidates[0].content.parts[0].text
  func extractGeminiContent(responseText : Text) : Text {
    let textMarker = "\"text\": \"";
    let textMarker2 = "\"text\":\"";
    var parts = responseText.split(#text(textMarker)).toArray();
    if (parts.size() < 2) {
      parts := responseText.split(#text(textMarker2)).toArray();
    };
    if (parts.size() < 2) {
      return "Error: Could not parse Gemini response";
    };
    let afterText = parts[1];
    var result = "";
    var escaped = false;
    var done = false;
    for (c in afterText.chars()) {
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
    if (result == "") { "Error: Empty Gemini response" } else { result };
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

  // Legacy API Key (OpenAI backward compat)
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

  // Multi-provider API Key Management
  public shared ({ caller }) func setProviderApiKey(provider : Text, apiKey : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (provider) {
      case ("openai") { apiKeys.add(caller, apiKey) };
      case ("anthropic") { anthropicKeys.add(caller, apiKey) };
      case ("google") { googleKeys.add(caller, apiKey) };
      case _ { Runtime.trap("Unknown provider: " # provider) };
    };
  };

  public query ({ caller }) func getProviderApiKeys() : async ProviderApiKeys {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    {
      openai = apiKeys.get(caller);
      anthropic = anthropicKeys.get(caller);
      google = googleKeys.get(caller);
    };
  };

  public shared ({ caller }) func setActiveProvider(provider : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (provider) {
      case ("openai" or "anthropic" or "google") {
        activeProviders.add(caller, provider);
      };
      case _ { Runtime.trap("Unknown provider: " # provider) };
    };
  };

  public query ({ caller }) func getActiveProvider() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    activeProviders.get(caller);
  };

  // AI Chat - routes to correct provider
  public shared ({ caller }) func sendMessageToAI(input : MessageInput) : async Project {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let project = getProjectInternal(input.projectId);
    ensureProjectOwner(project, caller);

    let provider = switch (activeProviders.get(caller)) {
      case (null) { "openai" };
      case (?p) { p };
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

    let systemPrompt = getSystemPrompt(project.outputType);

    let assistantContent = switch (provider) {
      case ("anthropic") {
        let apiKey = switch (anthropicKeys.get(caller)) {
          case (null) { Runtime.trap("No Anthropic API key found. Please add your Anthropic API key in Settings.") };
          case (?k) { k };
        };
        let messagesJson = buildAnthropicMessagesJson(updatedHistory);
        let requestBody = "{\"model\":\"claude-opus-4-5\",\"max_tokens\":16000,\"system\":\"" # escapeJson(systemPrompt) # "\",\"messages\":" # messagesJson # "}";
        let extraHeaders : [OutCall.Header] = [
          { name = "x-api-key"; value = apiKey },
          { name = "anthropic-version"; value = "2023-06-01" },
        ];
        let responseText = await OutCall.httpPostRequest(
          "https://api.anthropic.com/v1/messages",
          extraHeaders,
          requestBody,
          transform,
        );
        extractAnthropicContent(responseText);
      };
      case ("google") {
        let apiKey = switch (googleKeys.get(caller)) {
          case (null) { Runtime.trap("No Google API key found. Please add your Google API key in Settings.") };
          case (?k) { k };
        };
        let contentsJson = buildGeminiContentsJson(updatedHistory);
        let requestBody = "{\"system_instruction\":{\"parts\":[{\"text\":\"" # escapeJson(systemPrompt) # "\"}]},\"contents\":" # contentsJson # "}";
        let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" # apiKey;
        let extraHeaders : [OutCall.Header] = [];
        let responseText = await OutCall.httpPostRequest(
          url,
          extraHeaders,
          requestBody,
          transform,
        );
        extractGeminiContent(responseText);
      };
      case _ {
        // Default: OpenAI
        let apiKey = switch (apiKeys.get(caller)) {
          case (null) { Runtime.trap("No OpenAI API key found. Please go to Settings and add your OpenAI API key.") };
          case (?k) { k };
        };
        let messagesJson = buildOpenAIMessagesJson(updatedHistory, systemPrompt);
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
        extractOpenAIContent(responseText);
      };
    };

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
