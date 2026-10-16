import Nav from "@/components/Nav";
import Lookup from "@/components/Lookup";

export function generateMetadata({ params }: { params: { username: string } }) {
  return { title: `${params.username}: GitHub projects on Beacon` };
}

export default function Page({ params }: { params: { username: string } }) {
  return (<><Nav /><main className="wrap"><Lookup username={decodeURIComponent(params.username)} /></main></>);
}
