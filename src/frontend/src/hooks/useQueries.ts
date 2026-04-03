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
  return useMutation<Project, Error, MessageInput>({
    mutationFn: async (input: MessageInput): Promise<Project> => {
      if (!actor) throw new Error("Not connected");
      // Backend returns Project directly per the updated interface
      const result = await (actor.sendMessageToAI(input) as Promise<unknown>);
      // Handle both direct Project return and wrapped { project } return
      const project =
        (result as { project?: Project }).project ?? (result as Project);
      return project;
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

export function useGetProviderApiKeys() {
  const { actor, isFetching } = useActor();
  return useQuery<{
    openai: string | null;
    anthropic: string | null;
    google: string | null;
  }>({
    queryKey: ["providerApiKeys"],
    queryFn: async () => {
      if (!actor) return { openai: null, anthropic: null, google: null };
      // Cast to any: these methods are present at runtime but not in the generated TS interface
      return (actor as any).getProviderApiKeys();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetProviderApiKey() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      provider,
      apiKey,
    }: { provider: string; apiKey: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setProviderApiKey(provider, apiKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerApiKeys"] });
      queryClient.invalidateQueries({ queryKey: ["apiKey"] });
    },
  });
}

export function useGetActiveProvider() {
  const { actor, isFetching } = useActor();
  return useQuery<string | null>({
    queryKey: ["activeProvider"],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getActiveProvider();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetActiveProvider() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: string) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setActiveProvider(provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activeProvider"] });
    },
  });
}
