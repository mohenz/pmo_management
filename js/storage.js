import CONFIG from './config.js';

const { createClient } = supabase;

const SupabaseStorage = {
    client: createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY),

    /* --- Auth Operations --- */
    async login(email, password) {
        try {
            const { data, error } = await this.client
                .from('issue_users')
                .select('*')
                .eq('email', email)
                .eq('status', '사용')
                .single();

            if (error || !data) throw new Error('이메일 또는 비밀번호가 일치하지 않거나 중지된 계정입니다.');

            // Verify password using bcrypt (assumes bcryptjs is loaded in the browser)
            const isMatch = await dcodeIO.bcrypt.compare(password, data.password);
            if (!isMatch) throw new Error('비밀번호가 일치하지 않습니다.');

            return data;
        } catch (err) {
            console.error('Login Error:', err);
            throw err;
        }
    },

    /* --- Issue Operations --- */
    async getIssues(filters = {}) {
        let query = this.client
            .from('issues')
            .select('*')
            .eq('is_deleted', 'N')
            .order('created_at', { ascending: false });

        if (filters.status) query = query.eq('status', filters.status);
        if (filters.severity) query = query.eq('severity', filters.severity);
        if (filters.type) query = query.eq('issue_type', filters.type);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getIssueById(id) {
        const { data, error } = await this.client
            .from('issues')
            .select('*')
            .eq('issue_id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async saveIssue(issueData) {
        const isUpdate = !!issueData.issue_id;
        const now = new Date().toISOString();

        if (isUpdate) {
            const { data, error } = await this.client
                .from('issues')
                .update({ ...issueData, updated_at: now })
                .eq('issue_id', issueData.issue_id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            const id = Date.now();
            const { data, error } = await this.client
                .from('issues')
                .insert([{
                    ...issueData,
                    issue_id: id,
                    created_at: now,
                    updated_at: now
                }])
                .select();
            if (error) throw error;
            return data[0];
        }
    },

    async deleteIssue(id) {
        const { error } = await this.client
            .from('issues')
            .update({ is_deleted: 'Y', updated_at: new Date().toISOString() })
            .eq('issue_id', id);
        if (error) throw error;
    },

    /* --- Statistics --- */
    async getStats() {
        const { data, error } = await this.client
            .from('issues')
            .select('status, severity, issue_type')
            .eq('is_deleted', 'N');

        if (error) throw error;

        const stats = {
            total: data.length,
            status: {},
            severity: {},
            type: {}
        };

        data.forEach(item => {
            stats.status[item.status] = (stats.status[item.status] || 0) + 1;
            stats.severity[item.severity] = (stats.severity[item.severity] || 0) + 1;
            stats.type[item.issue_type] = (stats.type[item.issue_type] || 0) + 1;
        });

        return stats;
    }
};

export default SupabaseStorage;
