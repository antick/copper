import { useRef, useState } from "react";
import { MarkdownText } from "@/components/ui/markdown-text";
import { formatTaskTimestamp } from "@/features/tasks/task-selectors";
import { TaskMutationError } from "@/features/tasks/task-ui";
import type { TaskComment } from "@/lib/copper/tasks";

type CommentAction =
  | { kind: "add"; body: string }
  | { kind: "edit"; id: string; body: string }
  | { kind: "delete"; id: string };

export interface IssueCommentActions {
  add: (body: string) => Promise<unknown>;
  update: (commentId: string, body: string) => Promise<unknown>;
  delete: (commentId: string) => Promise<unknown>;
}

export function IssueComments({
  comments,
  actions,
}: {
  comments: TaskComment[];
  actions: IssueCommentActions;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<CommentAction | null>(null);

  async function run(action: CommentAction) {
    setPending(true);
    setError(null);
    try {
      if (action.kind === "add") await actions.add(action.body);
      else if (action.kind === "edit")
        await actions.update(action.id, action.body);
      else await actions.delete(action.id);
      setFailed(null);
      setEditingId(null);
      setConfirmDeleteId(null);
      if (action.kind === "add") setDraft("");
      inputRef.current?.focus();
    } catch (cause) {
      setFailed(action);
      setError(
        cause instanceof Error
          ? cause.message
          : "The comment could not be saved. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  function addComment() {
    const body = draft.trim();
    if (body) void run({ kind: "add", body });
  }

  return (
    <section
      className="copper-issue-comments"
      aria-labelledby="issue-comments-title"
    >
      <header>
        <h2 id="issue-comments-title">Comments</h2>
        <span>{comments.length}</span>
      </header>
      <TaskMutationError
        message={error}
        onRetry={failed ? () => void run(failed) : undefined}
      />
      <div className="copper-issue-comment-list">
        {comments.length === 0 ? (
          <p className="copper-issue-comments-empty">No comments yet.</p>
        ) : null}
        {comments.map((comment) => (
          <article key={comment.id} className="copper-issue-comment">
            <header>
              <strong>You</strong>
              <time dateTime={comment.updated}>
                {formatTaskTimestamp(comment.updated)}
              </time>
            </header>
            {editingId === comment.id ? (
              <div className="copper-issue-comment-edit">
                <textarea
                  aria-label="Edit comment"
                  autoFocus
                  value={editingBody}
                  onChange={(event) => setEditingBody(event.target.value)}
                />
                <div>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={pending || !editingBody.trim()}
                    onClick={() =>
                      void run({
                        kind: "edit",
                        id: comment.id,
                        body: editingBody.trim(),
                      })
                    }
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MarkdownText>{comment.body}</MarkdownText>
                <div className="copper-issue-comment-actions">
                  {confirmDeleteId === comment.id ? (
                    <>
                      <span>Delete this comment?</span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          void run({ kind: "delete", id: comment.id })
                        }
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditingBody(comment.body);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(comment.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      <div className="copper-issue-comment-composer">
        <textarea
          ref={inputRef}
          aria-label="New comment"
          placeholder="Write a comment in Markdown…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              addComment();
            }
          }}
        />
        <div>
          <span>Markdown supported · ⌘Enter to add</span>
          <button
            type="button"
            disabled={pending || !draft.trim()}
            onClick={addComment}
          >
            Add comment
          </button>
        </div>
      </div>
    </section>
  );
}
