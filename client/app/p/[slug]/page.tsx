import Nav from "@/components/Nav";
import Board from "@/components/Board";
export default function Page({ params }: { params: { slug: string } }) {
  return (<><Nav /><main className="wrap" style={{ maxWidth: 760 }}><Board slug={params.slug} /></main></>);
}
