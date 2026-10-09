import { Checkout } from '../../ui.tsx';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Checkout id={(await params).id} />;
}
