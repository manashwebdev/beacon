import Nav from "@/components/Nav";
import GitHubPanel from "@/components/GitHubPanel";

// Sits under the dashboard layout, so signed-out visitors are redirected to log in before this renders.
export default function Page() {
  return (<><Nav /><main className="wrap"><GitHubPanel /></main></>);
}
