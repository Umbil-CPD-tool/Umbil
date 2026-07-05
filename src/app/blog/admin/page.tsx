import Link from "next/link";
import { format } from "date-fns";
import { listPosts } from "./actions";

export default async function BlogAdminPage() {
  const posts = await listPosts();

  return (
    <section className="main-content">
      <div className="container">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between" style={{ marginBottom: 24 }}>
          <div>
            <h2>Blog posts</h2>
            <p className="text-slate-500">Manage drafts, scheduled posts, and published content.</p>
          </div>
          <Link href="/blog/admin/new" className="btn btn--primary">
            New post
          </Link>
        </div>

        <div className="card">
          <div className="card__body" style={{ overflowX: "auto" }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Title</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Publish date</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Last edited</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Tags</th>
                  <th className="pb-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-4 pr-6 align-top">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{post.title}</div>
                      <div className="text-xs text-slate-500">{post.slug}</div>
                    </td>
                    <td className="py-4 pr-6 align-top text-sm text-slate-700">{post.status}</td>
                    <td className="py-4 pr-6 align-top text-sm text-slate-700">
                      {post.publish_date ? format(new Date(post.publish_date), "PPP") : "—"}
                    </td>
                    <td className="py-4 pr-6 align-top text-sm text-slate-700">
                      {post.updated_at ? format(new Date(post.updated_at), "PPP") : "—"}
                    </td>
                    <td className="py-4 pr-6 align-top text-sm text-slate-700">
                      {post.tags?.length ? post.tags.join(", ") : "—"}
                    </td>
                    <td className="py-4 align-top">
                      <Link href={`/blog/admin/${post.id}/edit`} className="btn btn--outline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
