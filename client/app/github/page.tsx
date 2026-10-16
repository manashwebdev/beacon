import Nav from "@/components/Nav";
import Lookup from "@/components/Lookup";

export const metadata = { title: "Explore GitHub profiles on Beacon" };

// Public: anyone can search a GitHub username, no account needed.
export default function Page() {
  return (<><Nav /><main className="wrap"><Lookup /></main></>);
}
