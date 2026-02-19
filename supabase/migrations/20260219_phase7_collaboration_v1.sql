-- Phase 7: Rich Collaboration (Threaded Comments & Media)

-- 1. Enhance Comments Table for Threading
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES ticket_comments(id) ON DELETE CASCADE;

-- 2. Create Comment Attachments Table
CREATE TABLE IF NOT EXISTS comment_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id BIGINT REFERENCES ticket_comments(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View attachments for accessible comments" ON comment_attachments
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM ticket_comments WHERE id = comment_id));

CREATE POLICY "Post attachments with comments" ON comment_attachments
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM ticket_comments WHERE id = comment_id AND user_id = auth.uid()));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON ticket_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON comment_attachments(comment_id);
