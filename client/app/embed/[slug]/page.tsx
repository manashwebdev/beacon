import Board from "@/components/Board";
export default function Page({ params }: { params: { slug: string } }) {
  return (<main style={{ padding: 16 }}><Board slug={params.slug} embed /></main>);
}
