import { SkillDetail } from '../../skill-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SkillDetail id={(await params).id} />;
}
