import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Types
  type Message = {
    role : {
      #user;
      #assistant;
    };
    content : Text;
  };

  type Project = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    generatedHTML : Text;
    conversationHistory : [Message];
  };

  module Project {
    public func compare(project1 : Project, project2 : Project) : Order.Order {
      Nat.compare(project1.id, project2.id);
    };
  };

  public type ProjectInput = {
    name : Text;
    description : Text;
  };

  public type MessageInput = {
    projectId : Nat;
    message : Text;
  };

  // Users
  public type UserProfile = {
    name : Text;
  };

  // State
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let projects = Map.empty<Nat, Project>();
  let apiKeys = Map.empty<Principal, Text>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextProjectId = 0;

  // Internal helpers
  func getProjectInternal(id : Nat) : Project {
    switch (projects.get(id)) {
      case (null) { Runtime.trap("Project not found") };
      case (?project) { project };
    };
  };

  func ensureProjectOwner(project : Project, caller : Principal) {
    if (project.owner != caller) {
      Runtime.trap("Unauthorized: You are not the owner of this project");
    };
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Project CRUD Functions
  public shared ({ caller }) func createProject(input : ProjectInput) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create projects");
    };
    let id = nextProjectId;
    let project : Project = {
      id;
      owner = caller;
      name = input.name;
      description = input.description;
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

    let updatedProject = {
      id = project.id;
      owner = project.owner;
      name = input.name;
      description = input.description;
      createdAt = project.createdAt;
      updatedAt = Time.now();
      generatedHTML = project.generatedHTML;
      conversationHistory = project.conversationHistory;
    };

    projects.add(id, updatedProject);
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
      Runtime.trap("Unauthorized: Only users can list projects");
    };
    projects.entries().toArray().filter(
      func((id, project)) {
        project.owner == caller;
      }
    ).map(
      func((id, _)) { id }
    );
  };

  public query ({ caller }) func getUserProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list projects");
    };
    projects.values().toArray().filter(
      func(project) {
        project.owner == caller;
      }
    ).sort();
  };

  // API Key Management
  public shared ({ caller }) func setApiKey(apiKey : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set API keys");
    };
    apiKeys.add(caller, apiKey);
  };

  public query ({ caller }) func getApiKey() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access API keys");
    };
    apiKeys.get(caller);
  };

  // AI Chat
  public shared ({ caller }) func sendMessageToAI(input : MessageInput) : async () {
    let project = getProjectInternal(input.projectId);
    ensureProjectOwner(project, caller);

    let userMessage : Message = {
      role = #user;
      content = input.message;
    };

    let projectUpdateWithoutHTML = {
      id = project.id;
      owner = project.owner;
      name = project.name;
      description = project.description;
      createdAt = project.createdAt;
      updatedAt = Time.now();
    };
    let newProject = {
      projectUpdateWithoutHTML with
      generatedHTML = project.generatedHTML;
      conversationHistory = project.conversationHistory.concat([userMessage]);
    };
    projects.add(input.projectId, newProject);
  };

  // Export
  public query ({ caller }) func getGeneratedHTML(projectId : Nat) : async Text {
    let project = getProjectInternal(projectId);
    ensureProjectOwner(project, caller);
    project.generatedHTML;
  };

  // HTTP Outcall Transform
  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};
