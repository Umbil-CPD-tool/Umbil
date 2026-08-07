import Link from "next/link";
import { PostForm } from "../PostForm";
import { savePost } from "../actions";

export default function NewBlogPostPage() {
  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h2>New blog post</h2>
            <p className="text-slate-500">Write, schedule, and publish content from the admin interface.</p>
          </div>
          <Link href="/blog/admin" className="btn btn--outline">
            Back to posts
          </Link>
        </div>

        <div className="card">
          <div className="card__body">
            <PostForm action={savePost} mode="new" />
          </div>
        </div>
      </div>
    </section>
  );
}
