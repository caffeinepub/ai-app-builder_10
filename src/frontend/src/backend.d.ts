import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface ProjectInput {
    name: string;
    description: string;
    outputType: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Message {
    content: string;
    role: Variant_user_assistant;
}
export interface Project {
    id: bigint;
    owner: Principal;
    conversationHistory: Array<Message>;
    name: string;
    createdAt: Time;
    description: string;
    updatedAt: Time;
    outputType: string;
    generatedHTML: string;
}
export interface MessageInput {
    projectId: bigint;
    message: string;
    imageBase64: string | null;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_user_assistant {
    user = "user",
    assistant = "assistant"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createProject(input: ProjectInput): Promise<bigint>;
    deleteProject(id: bigint): Promise<void>;
    getApiKey(): Promise<string | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGeneratedHTML(projectId: bigint): Promise<string>;
    getProject(projectId: bigint): Promise<Project>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserProjectIds(): Promise<Array<bigint>>;
    getUserProjects(): Promise<Array<Project>>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessageToAI(input: MessageInput): Promise<Project>;
    setApiKey(apiKey: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateProject(id: bigint, input: ProjectInput): Promise<void>;
}
