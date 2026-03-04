import SupabaseStorage from './storage.js';

const App = {
    state: {
        currentView: 'dashboard',
        isLoggedIn: false,
        currentUser: null,
        issues: [],
        stats: null
    },

    async init() {
        console.log('ECLUB PMO App Initializing...');
        this.checkAuth();
        this.bindEvents();
        await this.render();
    },

    checkAuth() {
        const savedUser = sessionStorage.getItem('pmo_user');
        if (savedUser) {
            this.state.isLoggedIn = true;
            this.state.currentUser = JSON.parse(savedUser);
            document.getElementById('userSection').style.display = 'block';
            document.getElementById('loginPrompt').style.display = 'none';
            document.getElementById('userName').textContent = this.state.currentUser.name;
            document.getElementById('userRole').textContent = this.state.currentUser.role;
        }
    },

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                const view = e.target.closest('.nav-item').dataset.view;
                this.navigate(view);
            };
        });
    },

    async navigate(view) {
        this.state.currentView = view;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        await this.render();
    },

    async render() {
        const app = document.getElementById('app');
        app.innerHTML = '<div class="loader">데이터를 불러오는 중...</div>';

        if (this.state.currentView === 'login') {
            this.renderLogin(app);
            return;
        }

        if (!this.state.isLoggedIn) {
            this.navigate('login');
            return;
        }

        switch (this.state.currentView) {
            case 'dashboard':
                await this.renderDashboard(app);
                break;
            case 'list':
                await this.renderList(app);
                break;
            case 'register':
                this.renderRegister(app);
                break;
            default:
                app.innerHTML = '<h1>Coming Soon</h1>';
        }
    },

    async renderDashboard(container) {
        const stats = await SupabaseStorage.getStats();
        const issues = await SupabaseStorage.getIssues();

        container.innerHTML = `
            <header class="animate-in">
                <h1>PMO 대시보드</h1>
                <p class="subtitle">ECLUB 프로젝트의 실시간 리스크 및 이슈 현황입니다.</p>
            </header>

            <div class="stats-grid animate-in">
                <div class="stat-card glass">
                    <div style="color: var(--accent); font-size: 0.8rem; font-weight: 700;">전체 이슈</div>
                    <div class="stat-value">${stats.total}</div>
                </div>
                <div class="stat-card glass">
                    <div style="color: var(--danger); font-size: 0.8rem; font-weight: 700;">긴급/심각</div>
                    <div class="stat-value">${stats.severity['Critical'] || 0}</div>
                </div>
                <div class="stat-card glass">
                    <div style="color: var(--warning); font-size: 0.8rem; font-weight: 700;">진행 중</div>
                    <div class="stat-value">${(stats.status['발생'] || 0) + (stats.status['분석중'] || 0) + (stats.status['조치중'] || 0)}</div>
                </div>
                <div class="stat-card glass">
                    <div style="color: var(--success); font-size: 0.8rem; font-weight: 700;">해결됨</div>
                    <div class="stat-value">${stats.status['종결'] || 0}</div>
                </div>
            </div>

            <div class="animate-in" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
                <div class="glass" style="padding: 1.5rem;">
                    <h3><i class="fas fa-pie-chart"></i> 이슈 유형 분포</h3>
                    <canvas id="typeChart" style="max-height: 250px;"></canvas>
                </div>
                <div class="glass" style="padding: 1.5rem;">
                    <h3><i class="fas fa-signal"></i> 심각도 분포</h3>
                    <canvas id="severityChart" style="max-height: 250px;"></canvas>
                </div>
            </div>

            <div class="animate-in" style="margin-top: 3rem;">
                <h2>최근 등록 이슈 (TOP 5)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Display ID</th>
                            <th>이슈 제목</th>
                            <th>심각도</th>
                            <th>상태</th>
                            <th>해결기한</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${issues.slice(0, 5).map(i => `
                            <tr>
                                <td>${i.display_id}</td>
                                <td>${i.title}</td>
                                <td><span class="badge badge-${(i.severity || 'low').toLowerCase()}">${i.severity}</span></td>
                                <td>${i.status}</td>
                                <td>${i.target_date || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.renderCharts(stats);
    },

    renderCharts(stats) {
        const typeCtx = document.getElementById('typeChart').getContext('2d');
        new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.type),
                datasets: [{
                    data: Object.values(stats.type),
                    backgroundColor: ['#58a6ff', '#238636', '#d29922', '#f85149'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right', labels: { color: '#c9d1d9' } } }
            }
        });

        const sevCtx = document.getElementById('severityChart').getContext('2d');
        new Chart(sevCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(stats.severity),
                datasets: [{
                    label: '심각도별 건수',
                    data: Object.values(stats.severity),
                    backgroundColor: '#58a6ff66',
                    borderColor: '#58a6ff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { ticks: { color: '#8b949e' }, grid: { display: false } },
                    y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    async renderList(container) {
        const issues = await SupabaseStorage.getIssues();
        container.innerHTML = `
            <header class="animate-in">
                <h1>이슈 목록</h1>
                <p class="subtitle">모든 이슈의 상세 내역과 조치 현황을 관리합니다.</p>
            </header>

            <div class="animate-in">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>제목</th>
                            <th>유형</th>
                            <th>심각도</th>
                            <th>상태</th>
                            <th>PMO 담당자</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${issues.map(i => `
                            <tr onclick="App.showDetail(${i.issue_id})" style="cursor: pointer;">
                                <td>${i.display_id}</td>
                                <td>${i.title}</td>
                                <td>${i.issue_type}</td>
                                <td><span class="badge badge-${(i.severity || 'low').toLowerCase()}">${i.severity}</span></td>
                                <td>${i.status}</td>
                                <td>${i.pmo_assignee || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRegister(container) {
        container.innerHTML = `
            <header class="animate-in">
                <h1>이슈 등록</h1>
                <p class="subtitle">새로운 리스크 또는 이슈 사항을 기록합니다. PMO 내부 전용입니다.</p>
            </header>

            <form id="issueForm" class="glass animate-in" style="padding: 2rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">이슈 제목</label>
                        <input type="text" name="title" required style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">이슈 유형</label>
                        <select name="issue_type" style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white;">
                            <option value="범위">범위</option>
                            <option value="기획">기획</option>
                            <option value="자원">자원</option>
                            <option value="일정">일정</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">심각도</label>
                        <select name="severity" style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white;">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">PMO 담당자</label>
                        <input type="text" name="pmo_assignee" style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white;">
                    </div>
                </div>
                <div style="margin-top: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem;">상세 내용</label>
                    <textarea name="description" rows="5" style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white; resize: vertical;"></textarea>
                </div>
                <button type="submit" class="animate-in" style="margin-top: 2rem; background: var(--accent); color: white; border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%;">이슈 등록하기</button>
            </form>
        `;

        document.getElementById('issueForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.display_id = 'ISU-' + String(Date.now()).slice(-4);
            data.creator = this.state.currentUser.name;

            try {
                await SupabaseStorage.saveIssue(data);
                alert('이슈가 성공적으로 등록 되었습니다.');
                this.navigate('list');
            } catch (err) {
                alert('등록 중 오류가 발생했습니다: ' + err.message);
            }
        };
    },

    renderLogin(container) {
        container.innerHTML = `
            <div style="max-width: 400px; margin: 10vh auto; text-align: center;" class="animate-in">
                <i class="fas fa-shield-halved" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem;"></i>
                <h1 style="font-size: 1.75rem;">PMO 전용 로그인</h1>
                <p class="subtitle" style="margin-bottom: 2.5rem;">ECLUB 프로젝트 관리 권한이 필요합니다.</p>
                
                <form id="loginForm" class="glass" style="padding: 2.5rem; text-align: left;">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8125rem;">이메일</label>
                        <input type="email" name="email" required placeholder="admin@eclub.com" style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white;">
                    </div>
                    <div style="margin-bottom: 2rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8125rem;">비밀번호</label>
                        <input type="password" name="password" required style="width: 100%; padding: 0.75rem; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: white;">
                    </div>
                    <button type="submit" style="width: 100%; background: var(--accent); color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer; transition: transform 0.2s;">접속 인증</button>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 1.5rem; text-align: center;">계정이 없으신가요? 관리자에게 문의하세요.</p>
                </form>
            </div>
        `;

        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const pw = e.target.password.value;

            // Temporary Dev Bypass if no users yet
            if (email === 'pmo@eclub.com' && pw === 'pmo1234') {
                const user = { name: '테스트 관리자', role: 'PMO 리더', email };
                this.state.isLoggedIn = true;
                this.state.currentUser = user;
                sessionStorage.setItem('pmo_user', JSON.stringify(user));
                this.navigate('dashboard');
                location.reload(); // Refresh to update UI
                return;
            }

            try {
                const user = await SupabaseStorage.login(email, pw);
                this.state.isLoggedIn = true;
                this.state.currentUser = user;
                sessionStorage.setItem('pmo_user', JSON.stringify(user));
                this.navigate('dashboard');
                location.reload();
            } catch (err) {
                alert(err.message);
            }
        };
    },

    handleLogout() {
        sessionStorage.removeItem('pmo_user');
        this.state.isLoggedIn = false;
        location.reload();
    },

    closeModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

export default App;
