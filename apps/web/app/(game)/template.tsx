// Templates re-mount on every navigation, so each game screen settles in as it opens.
export default function GameTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
