import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MessageInput, Project, ProjectInput } from "../backend";
import { useActor } from "./useActor";

export function useGetUserProjects() {
  const { actor, isFetching } = useActor();
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProject(projectId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Project>({
    queryKey: ["project", projectId?.toString()],
    queryFn: async () => {
      if (!actor || !projectId) throw new Error("No project");
      return actor.getProject(projectId);
    },
    enabled: !!actor && !isFetching && !!projectId,
  });
}

export function useGetApiKey() {
  const { actor, isFetching } = useActor();
  return useQuery<string | null>({
    queryKey: ["apiKey"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getApiKey();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      if (!actor) throw new Error("Not connected");
      return actor.createProject(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSendMessageToAI() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MessageInput) => {
      if (!actor) throw new Error("Not connected");
      await actor.sendMessageToAI(input);
      return actor.getProject(input.projectId);
    },
    onSuccess: (project: Project) => {
      queryClient.setQueryData(["project", project.id.toString()], project);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSetApiKey() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.setApiKey(apiKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKey"] });
    },
  });
}
