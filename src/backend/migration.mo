import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  type Message = {
    role : {
      #user;
      #assistant;
    };
    content : Text;
  };

  type OldProject = {
    id : Nat;
    owner : Principal.Principal;
    name : Text;
    description : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    generatedHTML : Text;
    conversationHistory : [Message];
  };

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    projects : Map.Map<Nat, OldProject>;
    apiKeys : Map.Map<Principal.Principal, Text>;
    nextProjectId : Nat;
  };

  type NewProject = {
    id : Nat;
    owner : Principal.Principal;
    name : Text;
    description : Text;
    outputType : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    generatedHTML : Text;
    conversationHistory : [Message];
  };

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    projects : Map.Map<Nat, NewProject>;
    apiKeys : Map.Map<Principal.Principal, Text>;
    nextProjectId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newProjects = old.projects.map<Nat, OldProject, NewProject>(
      func(_id, oldProject) {
        { oldProject with outputType = "app" };
      }
    );
    {
      projects = newProjects;
      accessControlState = old.accessControlState;
      apiKeys = old.apiKeys;
      nextProjectId = old.nextProjectId;
    };
  };
};
