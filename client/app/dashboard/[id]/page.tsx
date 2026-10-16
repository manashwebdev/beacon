import Nav from "@/components/Nav";
import Manage from "@/components/Manage";
export default function Page({ params }: { params: { id: string } }) {
  return (<><Nav /><main className="wrap"><Manage id={params.id} /></main></>);
}
