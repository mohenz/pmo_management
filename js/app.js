import SupabaseStorage from './storage.js';

const App = {
    state: {
        currentView: 'dashboard',
        isLoggedIn: false,
        currentUser: null,
        issues: [],
        stats: null,
        listConfig: {
            page: 1,
            pageSize: 20,
            search: {
                severity: '',
                status: '',
                issue_type: '',
                pmo_assignee: '',
                title: ''
            }
        }
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
        // Reset list page when navigating
        if (view === 'list' && this.state.listConfig) {
            this.state.listConfig.page = 1;
        }
        await this.render();
    },

    handleSearchChange() {
        this.state.listConfig.search.severity = document.getElementById('searchSeverity').value;
        this.state.listConfig.search.status = document.getElementById('searchStatus').value;
        this.state.listConfig.search.issue_type = document.getElementById('searchType').value;
        this.state.listConfig.search.pmo_assignee = document.getElementById('searchAssignee').value;
        this.state.listConfig.search.title = document.getElementById('searchTitle').value;
        this.state.listConfig.page = 1;
        this.render();
    },

    resetFilters() {
        this.state.listConfig.search = {
            severity: '',
            status: '',
            issue_type: '',
            pmo_assignee: '',
            title: ''
        };
        this.state.listConfig.page = 1;
        this.render();
    },

    handlePageSizeChange() {
        this.state.listConfig.pageSize = parseInt(document.getElementById('pageSizeSelect').value);
        this.state.listConfig.page = 1;
        this.render();
    },

    changePage(p) {
        this.state.listConfig.page = p;
        this.render();
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

    async handleInlineUpdate(id, field, value) {
        try {
            await SupabaseStorage.saveIssue({
                issue_id: id,
                [field]: value
            });
            console.log(`Updated ${field} to ${value} for issue ${id}`);
            // Refresh to ensure all dependencies (like stats or badge colors) are updated
            await this.render();
        } catch (err) {
            alert('업데이트 실패: ' + err.message);
            await this.render();
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
                    <h3><i class="fas fa-chart-bar"></i> 이슈 유형 분포</h3>
                    <canvas id="typeChart" style="max-height: 250px;"></canvas>
                </div>
                <div class="glass" style="padding: 1.5rem;">
                    <h3><i class="fas fa-signal"></i> 심각도 분포</h3>
                    <canvas id="severityChart" style="max-height: 250px;"></canvas>
                </div>
            </div>

            <div class="animate-in" style="margin-top: 3rem;">
                <h2>최근 등록 이슈 (미종결 건 TOP 5)</h2>
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
                        ${issues.filter(i => i.status !== '종결').slice(0, 5).map(i => `
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
            type: 'bar',
            data: {
                labels: Object.keys(stats.type),
                datasets: [{
                    label: '유형별 건수',
                    data: Object.values(stats.type),
                    backgroundColor: '#58a6ff66',
                    borderColor: '#58a6ff',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                scales: {
                    x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
                    y: { ticks: { color: '#8b949e' }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
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
        const config = this.state.listConfig;
        const search = config.search;
        let issues = await SupabaseStorage.getIssues();

        // Client-side filtering
        let filtered = issues.filter(i => {
            const matchesSeverity = !search.severity || i.severity === search.severity;
            const matchesStatus = !search.status || i.status === search.status;
            const matchesType = !search.issue_type || i.issue_type === search.issue_type;
            const matchesAssignee = !search.pmo_assignee || (i.pmo_assignee && i.pmo_assignee.includes(search.pmo_assignee));
            const matchesTitle = !search.title || i.title.includes(search.title);

            return matchesSeverity && matchesStatus && matchesType && matchesAssignee && matchesTitle;
        });

        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / config.pageSize);
        const startIndex = (config.page - 1) * config.pageSize;
        const pagedData = filtered.slice(startIndex, startIndex + config.pageSize);

        container.innerHTML = `
            <header class="animate-in" style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1>이슈 관리 목록</h1>
                    <p class="subtitle">모든 프로젝트 이슈를 상세하게 조회 및 관리합니다.</p>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline" style="color: #4ade80;" onclick="alert('엑셀 다운로드 기능은 오프라인 환경에서 준비 중입니다.')"><i class="fas fa-file-excel"></i> 엑셀 다운로드</button>
                    <button class="btn btn-primary" onclick="App.showIssueModal()"><i class="fas fa-plus"></i> 신규 이슈 등록</button>
                </div>
            </header>

            <!-- Search Filters -->
            <div class="form-container animate-in" style="margin-bottom: 1.5rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; align-items: end;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>이슈 유형</label>
                        <select id="searchType" onchange="App.handleSearchChange()">
                            <option value="">전체</option>
                            <option value="범위" ${search.issue_type === '범위' ? 'selected' : ''}>범위</option>
                            <option value="기획" ${search.issue_type === '기획' ? 'selected' : ''}>기획</option>
                            <option value="자원" ${search.issue_type === '자원' ? 'selected' : ''}>자원</option>
                            <option value="일정" ${search.issue_type === '일정' ? 'selected' : ''}>일정</option>
                            <option value="기타" ${search.issue_type === '기타' ? 'selected' : ''}>기타</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>심각도</label>
                        <select id="searchSeverity" onchange="App.handleSearchChange()">
                            <option value="">전체</option>
                            <option value="Low" ${search.severity === 'Low' ? 'selected' : ''}>Low</option>
                            <option value="Medium" ${search.severity === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="High" ${search.severity === 'High' ? 'selected' : ''}>High</option>
                            <option value="Critical" ${search.severity === 'Critical' ? 'selected' : ''}>Critical</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>현재 상태</label>
                        <select id="searchStatus" onchange="App.handleSearchChange()">
                            <option value="">전체</option>
                            <option value="발생" ${search.status === '발생' ? 'selected' : ''}>발생</option>
                            <option value="분석중" ${search.status === '분석중' ? 'selected' : ''}>분석중</option>
                            <option value="조치중" ${search.status === '조치중' ? 'selected' : ''}>조치중</option>
                            <option value="종결" ${search.status === '종결' ? 'selected' : ''}>종결</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>PMO 담당자</label>
                        <input type="text" id="searchAssignee" value="${search.pmo_assignee}" oninput="App.handleSearchChange()" placeholder="담당자명 검색">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label>이슈 제목</label>
                        <input type="text" id="searchTitle" value="${search.title}" oninput="App.handleSearchChange()" placeholder="제목 키워드 검색">
                    </div>
                    <button class="btn btn-outline" onclick="App.resetFilters()">초기화</button>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    총 <strong>${totalItems}</strong>건 (${config.page} / ${totalPages || 1} 페이지)
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <label style="margin:0; font-size: 0.8125rem; color: var(--text-secondary);">출력 개수:</label>
                    <select id="pageSizeSelect" onchange="App.handlePageSizeChange()" style="width: 80px; padding: 0.3rem;">
                        <option value="20" ${config.pageSize == 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${config.pageSize == 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${config.pageSize == 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
            </div>

            <div class="data-table-container animate-in">
                <table style="min-width: 1500px;">
                    <thead>
                        <tr>
                            <th>관리 ID</th>
                            <th>구분</th>
                            <th>이슈 유형</th>
                            <th style="min-width: 350px;">이슈 제목</th>
                            <th>심각도</th>
                            <th>우선순위</th>
                            <th>상태</th>
                            <th>발생일</th>
                            <th>해결기한</th>
                            <th>담당자</th>
                            <th>유관부서</th>
                            <th>등록자</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagedData.map(i => `
                            <tr>
                                <td>${i.display_id}</td>
                                <td>${i.category || 'PMO'}</td>
                                <td>
                                    <select onchange="App.handleInlineUpdate(${i.issue_id}, 'issue_type', this.value)" style="padding: 0.2rem; border: none; background: transparent; font-size: 0.875rem;">
                                        ${['범위', '기획', '자원', '일정', '기타'].map(t => `<option value="${t}" ${i.issue_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                                    </select>
                                </td>
                                <td>
                                    <strong style="color: var(--accent); cursor: pointer;" onclick="App.showDetail(${i.issue_id})">${i.title}</strong>
                                </td>
                                <td>
                                    <select onchange="App.handleInlineUpdate(${i.issue_id}, 'severity', this.value)" class="badge-select badge-${(i.severity || 'low').toLowerCase()}">
                                        ${['Low', 'Medium', 'High', 'Critical'].map(s => `<option value="${s}" ${i.severity === s ? 'selected' : ''}>${s}</option>`).join('')}
                                    </select>
                                </td>
                                <td>
                                    <select onchange="App.handleInlineUpdate(${i.issue_id}, 'priority', this.value)" style="padding: 0.2rem; border: 1px solid var(--border); border-radius: 4px; background: white;">
                                        <option value="-" ${!i.priority || i.priority === '-' ? 'selected' : ''}>-</option>
                                        <option value="상" ${i.priority === '상' ? 'selected' : ''}>상</option>
                                        <option value="중" ${i.priority === '중' ? 'selected' : ''}>중</option>
                                        <option value="하" ${i.priority === '하' ? 'selected' : ''}>하</option>
                                    </select>
                                </td>
                                <td>
                                    <select onchange="App.handleInlineUpdate(${i.issue_id}, 'status', this.value)" style="padding: 0.2rem; border: 1px solid var(--border); border-radius: 4px; background: white; font-weight: 600;">
                                        ${['발생', '분석중', '조치중', '종결'].map(s => `<option value="${s}" ${i.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                                    </select>
                                </td>
                                <td>${i.occurrence_date || '-'}</td>
                                <td>
                                    <input type="date" value="${i.target_date || ''}" onchange="App.handleInlineUpdate(${i.issue_id}, 'target_date', this.value)" style="padding: 0.1rem 0.3rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.75rem; width: 110px;">
                                </td>
                                <td>
                                    <input type="text" value="${i.pmo_assignee || ''}" onblur="App.handleInlineUpdate(${i.issue_id}, 'pmo_assignee', this.value)" style="padding: 0.2rem; border: 1px solid var(--border); border-radius: 4px; width: 80px; font-size: 0.8125rem;">
                                </td>
                                <td>${i.related_dept || '-'}</td>
                                <td>${i.creator || '-'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="12" style="text-align: center; padding: 4rem; color: var(--text-secondary);">해당 조건의 이슈가 없습니다.</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 2rem; display: flex; justify-content: center; gap: 0.5rem;" class="animate-in">
                <button class="btn btn-outline" onclick="App.changePage(${config.page - 1})" ${config.page === 1 ? 'disabled' : ''}>이전</button>
                <div style="display: flex; align-items: center; padding: 0 1rem; color: var(--text-primary); font-weight: 600;">${config.page} / ${totalPages || 1}</div>
                <button class="btn btn-outline" onclick="App.changePage(${config.page + 1})" ${config.page >= totalPages ? 'disabled' : ''}>다음</button>
            </div>
        `;
    },

    renderRegister(container) {
        this.showIssueModal();
        container.innerHTML = `<div style="text-align: center; padding: 5rem;">
            <h2>이슈 등록 모달이 열려 있습니다.</h2>
            <p class="subtitle">목록 화면에서 신규 등록 버튼을 이용하셔도 됩니다.</p>
            <button onclick="App.navigate('list')" class="btn" style="margin-top: 1rem; color: var(--accent);">이슈 목록으로 돌아가기</button>
        </div>`;
    },

    renderLogin(container) {
        container.innerHTML = `
        <div style="max-width: 400px; margin: 10vh auto; text-align: center;" class="animate-in">
            <i class="fas fa-shield-halved" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem;"></i>
            <h1 style="font-size: 1.75rem;">PMO 전용 로그인</h1>
            <p class="subtitle" style="margin-bottom: 2.5rem;">ECLUB 프로젝트 관리 권한이 필요합니다.</p>

            <form id="loginForm" class="glass" style="padding: 2.5rem; text-align: left; background: white; border: 1px solid var(--border);">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8125rem;">이메일</label>
                    <input type="email" name="email" required placeholder="admin@eclub.com" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                </div>
                <div style="margin-bottom: 2rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8125rem;">비밀번호</label>
                    <input type="password" name="password" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
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

    async showDetail(id) {
        this.showIssueModal(id);
    },

    async showIssueModal(id = null) {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalBody = document.getElementById('modalBody');
        let issue = id ? await SupabaseStorage.getIssueById(id) : {};

        modalBody.innerHTML = `
            <div class="animate-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2><i class="fas ${id ? 'fa-edit' : 'fa-plus-circle'}"></i> ${id ? '이슈 정보 및 수정' : '신규 이슈 등록'}</h2>
                </div>

                <form id="issueModalForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
                    <div style="grid-column: span 2;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">이슈 제목</label>
                        <input type="text" name="title" required value="${issue.title || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">이슈 유형</label>
                        <select name="issue_type" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                            ${['범위', '기획', '자원', '일정', '기타'].map(t => `<option value="${t}" ${issue.issue_type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">심각도</label>
                        <select name="severity" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                            ${['Low', 'Medium', 'High', 'Critical'].map(s => `<option value="${s}" ${issue.severity === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">현재 상태</label>
                        <select name="status" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                            ${['발생', '분석중', '조치중', '종결'].map(s => `<option value="${s}" ${issue.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">PMO 담당자</label>
                        <input type="text" name="pmo_assignee" value="${issue.pmo_assignee || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">해결기한</label>
                        <input type="date" name="target_date" value="${issue.target_date || ''}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">보고라인</label>
                        <input type="text" name="report_line" value="${issue.report_line || ''}" placeholder="예시: 실무진, 경영진 등" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
                    </div>

                    <div style="grid-column: span 2; margin-top: 0.5rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">상세 내용 및 원인</label>
                        <textarea name="description" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; resize: vertical;">${issue.description || ''}</textarea>
                    </div>

                    <div style="grid-column: span 2; margin-top: 0.5rem;">
                        <label style="display: block; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.4rem;">내부 대응 전략 및 조치 계획</label>
                        <textarea name="action_plan" rows="4" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; resize: vertical;">${issue.action_plan || ''}</textarea>
                    </div>

                    <div style="grid-column: span 2; margin-top: 2rem; display: flex; gap: 1rem;">
                        ${id ? `
                            <button type="button" onclick="App.handleDelete(${id})" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); padding: 1rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer;">이슈 삭제</button>
                        ` : ''}
                        <button type="submit" style="flex: 1; background: var(--accent); color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer;">정보 저장</button>
                        <button type="button" onclick="App.closeModal()" style="flex: 1; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); padding: 1rem; border-radius: 8px; font-weight: 700; cursor: pointer;">닫기</button>
                    </div>
                </form>
            </div >
    `;

        document.getElementById('issueModalForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            if (id) {
                data.issue_id = id;
            } else {
                data.display_id = 'ISU-' + String(Date.now()).slice(-4);
                data.creator = this.state.currentUser.name;
                data.occurrence_date = new Date().toISOString().split('T')[0];
            }

            try {
                await SupabaseStorage.saveIssue(data);
                alert(id ? '수정되었습니다.' : '등록되었습니다.');
                this.closeModal();
                this.render(); // Refresh current view
            } catch (err) {
                alert('처리 중 오류 발생: ' + err.message);
            }
        };

        modalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },
    async handleDelete(id) {
        if (confirm('정말로 이 이슈를 삭제하시겠습니까?')) {
            try {
                await SupabaseStorage.deleteIssue(id);
                alert('삭제되었습니다.');
                this.closeModal();
                this.render();
            } catch (err) {
                alert('삭제 실패: ' + err.message);
            }
        }
    },

    closeModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

export default App;
