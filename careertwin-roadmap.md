CareerTwin Product Roadmap
This roadmap is a product-direction and planning document. It records current assessment plus target direction; it is not proof that every listed surface is implemented today.

Phase 1 — Job Hunter MVP（current roadmap assessment）

目标：

证明 Career Memory + Job Intelligence 可以匹配岗位

Roadmap assessment: roughly 80% complete for planning purposes, not as implementation proof.

系统结构：

Resume Upload
↓
Career Memory
(experiences + evidence_pieces)
↓
Capability Inference
↓
Job Fetch
(Adzuna)
↓
Job Signals
↓
Matching Engine
↓
Top Job Matches

当前完成（roadmap assessment）：

✔ Resume parsing
✔ EvidencePieces
✔ Capability inference
✔ Job fetching
✔ Job dedupe
✔ Job matching
✔ match_score

Phase 1 还剩 3 件事（roadmap target）
1 Resume Tailoring（Evidence-first）

这是你现在 priority。

EvidencePieces
↓
Score against JD
↓
Select best evidence
↓
Rewrite bullets
↓
Tailored resume

目标：

Top job → 1-click tailored resume
2 Job Match Explainability

让用户知道：

Why this job matches

例如：

Match score: 84

Matched capabilities:
• Program leadership
• Analytics strategy
• Stakeholder management

Evidence used:
• Led Power BI transformation
• Built analytics capability framework

这是 产品价值非常大的部分。

3 Gap Detection

自动发现：

Missing capabilities

Example：

Required: Product roadmap ownership
Missing: Product lifecycle leadership
Phase 1 Milestone（target milestone）

当用户可以：

Upload resume
↓
See top jobs
↓
Generate tailored resume

到这里，可视为完成 Phase 1 MVP milestone。

Phase 2 — Career Intelligence（target direction）

目标：

CareerTwin 不只是找工作，而是 理解你的职业路径

新增能力：

Capability Graph

从 flat list：

Analytics
Strategy
Leadership

变成：

Analytics Strategy
 ├── Experimentation
 ├── Measurement
 └── Data storytelling

能力：

capability hierarchy
capability strength
capability growth
Career Profile Page

新增 /career 页面：

Career Snapshot
Capability Map
Evidence Highlights
Career Trajectory

Example：

Top Capabilities
• Analytics Strategy
• Program Leadership
• Data Product Thinking
Role Fit Map

不是只推荐 jobs，而是：

Roles you are strong for
Roles you are close to
Roles you could grow into

Example：

Strong fit
Analytics Manager
Insights Manager

Close
Head of Analytics

Future
Chief Data Officer
Phase 2 Milestone（target milestone）

CareerTwin 可以回答：

What am I good at?
Where can my career go?
Phase 3 — Career Strategy Engine（target direction）

目标：

CareerTwin 成为 职业规划 AI

新增能力：

Promotion Strategy

Example：

Goal: Head of Analytics

Missing capabilities
• team leadership >10
• org strategy

Suggested actions
• lead cross-team program
• own analytics roadmap
Career Transition

Example：

Analytics → Data Product

CareerTwin 会生成：

Transferable capabilities
Skill gaps
Suggested projects
Opportunity Radar

不仅看 job boards。

还看：

market trends
emerging roles
industry signals

Example：

Emerging role:
AI Transformation Lead
Phase 3 Milestone（target milestone）

CareerTwin 可以回答：

What should I do next in my career?
Phase 4 — AI Career Agent（target direction）

目标：

CareerTwin 成为 长期职业伙伴

新增能力：

Continuous Career Memory

不仅从 resume 来。

来源：

projects
performance reviews
LinkedIn updates
learning history

Evidence 不断增长。

Opportunity Agent

自动发现机会：

new job
internal promotion
conference speaking
advisor roles
Personal Career Twin

系统可以回答：

Should I apply for this role?
Should I move into AI strategy?
Is this promotion realistic?
完整 Product Evolution
Phase 1
Job Hunter

Phase 2
Career Intelligence

Phase 3
Career Strategy

Phase 4
AI Career Agent
一个非常关键的判断

你现在做的 Job Hunter 只是入口场景。

真正的产品是：

Career Memory

如果 Career Memory 做得好：

job search
career strategy
promotion planning

都会自然长出来。

最后一个建议（很重要）

我建议把这份路线图持续保留在 repo 中：

careertwin-roadmap.md

写一句核心原则：

Every feature must increase Career Memory.

因为：

CareerTwin = Career Memory System
