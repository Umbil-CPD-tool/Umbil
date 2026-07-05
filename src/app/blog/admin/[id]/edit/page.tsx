import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePost, getPostById, savePost } from "../../actions";
import { PostForm } from "../../PostForm";
import DeletePostButton from "../../DeletePostButton";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function EditBlogPostPage({ params }: PageProps) {
  const post = await getPostById(params.id);
  if (!post) {
    notFound();
  }

  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h2>Edit blog post</h2>
            <p className="text-slate-500">Update content, status, publish date, and cover image.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/blog/admin" className="btn btn--outline">
              Back to posts
            </Link>
            <DeletePostButton id={params.id} action={deletePost} />
          </div>
        </div>

        <div className="card">
          <div className="card__body">
            <PostForm action={savePost} initialPost={post} mode="edit" />
          </div>
        </div>
      </div>
    </section>
  );
}
