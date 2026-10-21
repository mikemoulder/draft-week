import { ApiStatus } from "@/components/api-status";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Draft Week</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Fantasy football for trading. Draft real Strike traders, and their real trades score your points.
      </p>
      <ApiStatus />
    </main>
  );
}
