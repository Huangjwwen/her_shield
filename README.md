```markdown
# 「Her Shield」— Workplace Women's Rights Guardian Agent

<p align="center">
  <img src="logo.png" alt="Her Shield Logo" width="120">
</p>

<p align="center">
  <strong>Behind you stands a "Her" who understands the law and you</strong><br>
  <em>AI-Powered Workplace Women's Rights Guardian Companion</em>
</p>

<p align="center">
  Precise Identification · Evidence Preservation · Path Guidance · Emotional Support
</p>

<p align="center">
  <a href="#-project-introduction">Project Introduction</a> •
  <a href="#-core-features">Core Features</a> •
  <a href="#-technical-architecture">Technical Architecture</a> •
  <a href="#-quick-start">Quick Start</a>
</p>

---

> **2026 Tencent Kaiwu Global AI Open Competition · D06 Legal AI Application Innovation & Practice**
> 17th China University Student Service Outsourcing Innovation and Entrepreneurship Competition AI Special Event Entry
> Team: SheSaysTeam

---

## 📖 Project Introduction

### Project Manifesto

**「Her Shield」** — Workplace Women's Rights Guardian Agent

> When you hesitate, it gives you the confidence to break through
> 
> When you're hurt, it gives you the warmth of an embrace

### Core Positioning

**Her Shield is not just a tool, but a complete solution "from emotion to action"**

When a working woman faces gender discrimination or sexual harassment, the real dilemma is never a single issue, but a broken chain:

- 🔴 **Unsure** whether it's illegal or not
- 🔴 **Don't know** how to respond
- 🔴 **Can't** collect evidence
- 🔴 **Afraid** to take the first step towards justice

👉 **Her Shield's goal is to reconnect this broken chain**

### Core Value

| Before | → | After |
|--------|:-:|--------|
| Emotional dysregulation | → | Clear cognition |
| Clueless | → | Clear path |
| Isolated and helpless | → | Supported, confident |

**Core Innovation:** A fusion agent combining Legal Expertise × AI Efficiency × Emotional Support

| Solution Type | Characteristics |
|---------------|----------------|
| Traditional Legal Platforms | Professional but cold |
| Community Platforms | Empathetic but not professional |
| **Her Shield** | 👉 **Can both judge and accompany; provide answers and support** |

---

## ✨ Core Features

### Six Intelligent Modules

#### 🔍 Judgment Layer (Help users "see clearly")

| Module | Description | Core Capabilities |
|--------|-------------|--------------------|
| **Her Eye · Conduct Radar** | Identify inappropriate workplace conduct, provide response suggestions | ⚡ Real-time legality determination · 📖 Plain-language law explanation · 💬 Three-level response scripts |
| **Her Right · Rights Guide** | Quickly assess rights status, clarify direction for action | 🎯 Scenario-based matching · 📊 Visualized rights checklist · 🔍 Traceable legal basis |

#### 🧾 Evidence Layer (Give users "confidence")

| Module | Description | Core Capabilities |
|--------|-------------|--------------------|
| **Her Evidence · Evidence Preservation** | Professional guidance on evidence collection, enhance rights protection confidence | 🔗 Evidence chain thinking guidance · 📋 Solutions for six typical scenarios · ⚖️ Legal boundary reminders |

#### 🧭 Action Layer (Enable users "to act")

| Module | Description | Core Capabilities |
|--------|-------------|--------------------|
| **Her Action · Action Navigation** | Full-process rights protection path, professional step-by-step guidance | 📊 Six-step ladder path · ⏰ Key deadline reminders · 🔀 Branch decision support |

#### 💬 Support Layer (Keep users "from breaking down")

| Module | Description | Core Capabilities |
|--------|-------------|--------------------|
| **Her Heart · Emotional Harbor** | Emotional expression support, warm companionship and listening | 💖 Emotion-first principle · 🌈 Non-judgmental responses · 🫂 Empathetic interaction |
| **Her Voice · Resonance Echoes** | Share rights protection experiences, mutual growth community | 🎭 Anonymization protection · 📚 Real case library · 🤝 Peer support mechanism |

### Typical Usage Path

```
📌 Unsure if it's gender discrimination/harassment? → Her Eye · Conduct Radar
📌 Want to know what protections your situation has? → Her Right · Rights Guide
📌 Ready to take action? → Her Evidence · Evidence Preservation → Her Action · Action Navigation
📌 Feeling wronged, scared, conflicted? → Her Heart · Emotional Harbor
📌 Want to see others' stories? → Her Voice · Resonance Echoes
```

---

## 🎯 Use Scenarios

### Scenario 1: Marital/Pregnancy Invisible Discrimination During Interview (Job Seeking)

**User Persona:** Xiao Li · 25 years old, fresh graduate · Interviewing for product manager position at an internet company

1. **Real-time radar scan:** Immediately open 「Her Eye · Conduct Radar」 after the interview, input HR's follow-up questions
2. **AI legal determination:** System determines the question likely violates Article 43 of the Law on the Protection of Women's Rights and Interests
3. **One-click response generation:** Obtain suggestions for "high EQ rebuttal"
4. **Rights protection path guidance:** If not hired because of this, 「Her Action · Action Navigation」 provides complaint process

**Result:** ✅ Xiao Li no longer second-guesses, uses generated script to politely question, interview proceeds to next round smoothly

### Scenario 2: Forced Demotion and Salary Cut During Pregnancy (Workplace Negotiation)

**User Persona:** Ms. Zhang · 32 years old · 4 months pregnant · Verbally notified of job transfer and salary reduction

1. **Rights confirmation:** Input current situation in 「Her Right · Rights Guide」, system highlights relevant legal protections
2. **Evidence collection guidance:** 「Her Evidence · Evidence Preservation」 generates evidence collection guide
3. **Full-process navigation:** 「Her Action · Action Navigation」 plans a three-step strategy

**Result:** ✅ Company realizes high cost of violation, proactively withdraws job transfer notice

### Scenario 3: Late-night Workplace Sexual Harassment (Crisis Response)

**User Persona:** Ms. Wang · 28 years old · Receives explicit WeChat messages late at night from direct supervisor

1. **Emotional first aid:** Immediately enter 「Her Heart · Emotional Harbor」
2. **Stealth evidence collection:** Use "guideless mode" in 「Her Evidence · Evidence Preservation」
3. **Resonance echoes:** See similar successful cases in 「Her Voice · Resonance Echoes」

**Result:** ✅ Evidence chain complete, company intervenes and disciplines the supervisor involved

---

## 🛠️ Technical Architecture

### Tech Stack

| Architecture Layer | Technology Components | Purpose |
|--------------------|-----------------------|---------|
| Interaction Layer | HTML5 + CSS3 + Vanilla JS · Electron Desktop | Zero-dependency pure static, low barrier, high compatibility, one-click deployment |
| Intelligence Layer | Tencent Yuanqi 5 dedicated agents (Bearer Token auth) | Scenario recognition, legal provision matching, evidence guidance, rights protection path, emotional support |
| Invocation Layer | `yuanqi.tencent.com/openapi/v1/agent/chat/completions` | Unified API entry |
| Knowledge Layer | Law on Women's Rights Protection, Labor Contract Law, Civil Code, Labor Law, Special Regulations on Protection of Female Employees | Injected into each agent's System Prompt |
| Security Layer | HTTPS · Disclaimer · No storage of sensitive user input | Protect user privacy and security |

### Technical Highlights

- 5 independent agents with distinct responsibilities, can be iterated independently
- Simulated data fallback mechanism ensures demo usability
- Session ID management enables multi-turn continuous questioning
- Clear placeholder examples and loading feedback lower usage barriers for non-technical users

---

## 📁 Project Structure

```
Her_shield/
├── index.html          # Homepage entry
├── features.html       # Core features page
├── logo.png            # Project Logo
├── package.json        # Project configuration file
├── Dockerfile          # Docker deployment config
├── css/
│   └── style.css       # Global styles
├── js/
│   └── app.js          # JavaScript business logic
└── electron/
    └── main.js         # Electron main process
```

---

## 🚀 Quick Start

### Method 1: Web Preview

```bash
# Enter project directory
cd Her_shield

# Method 1: Using npm script
npm run dev

# Method 2: Directly using npx
npx http-server . -p 8080 -c-1
```

Then visit http://localhost:8080

### Method 2: Electron Desktop

```bash
# Enter project directory
cd Her_shield

# Install Electron (first run)
npm run install-electron

# Launch desktop app
npm start
```

### Method 3: Docker Deployment

```bash
# Build image
docker build -t tad-shield .

# Run container
docker run -d -p 8080:80 tad-shield

# Visit http://localhost:8080
```

---

## 🔌 Tencent Yuanqi Agent Integration

The project has reserved integration interfaces with Tencent Yuanqi agents. Please configure actual APIs in the corresponding functions in `js/app.js`:

| Function Name | Module |
|---------------|--------|
| `callSmartAgent_radar()` | Her Eye · Conduct Radar |
| `callSmartAgent_selfcheck()` | Her Right · Rights Guide |
| `callSmartAgent_evidence()` | Her Evidence · Evidence Preservation |
| `callSmartAgent_guide()` | Her Action · Action Navigation |
| `callSmartAgent_harbor()` | Her Heart · Emotional Harbor |

---

## 🎨 Design Specifications

### Color System

| Purpose | Color Value | Description |
|---------|-------------|-------------|
| Primary Color | `#9370DB` | Warm purple, representing female strength and gentleness |
| Secondary Color | `#F5F5F5` | Light gray background |
| Text Color | `#333333` | Main text color |
| Emphasis Color | `#000000` | Key emphasized content |

### Design Features

- 🌸 Simple and elegant interface style
- 📱 Responsive design, adapts to multiple devices
- ♿ Focus on accessible experience

---

## 💡 Social Value

### Her Shield's significance is not just solving problems, but changing a "silent structure"

In reality, most women don't fail to assert their rights because they don't want to, but because:

- They're unsure if they are "qualified to assert rights"
- They don't know where to start
- They miss the optimal timing due to hesitation

👉 **What Her Shield does:**

| Barrier Reduction | Specific Implementation |
|-------------------|--------------------------|
| 🧠 Reduce the **psychological barrier** to rights protection | Emotional support, companionship, so users no longer feel alone |
| 📋 Reduce the **information barrier** to action | Plain-language legal explanations, clear rights checklist |
| 🔧 Reduce the **technical barrier** to evidence collection | Operational-level evidence guidance, step-by-step teaching |

### Beyond cold algorithms and code

We firmly believe: **Technology is rational, but the people using it have warmth.**

**For individuals,** "Her Shield" is a lamp in the dark night, a lawyer ready at hand in the pocket, so every request for help gets a response, and every grievance finds a place.

**For society,** we are not just solving individual cases, but also accumulating a "risk insight" into China's workplace gender environment, promoting workplace civilization from "post-event remedy" to "pre-event prevention."

---

## 👥 About the Team

- **Team Name:** SheSaysTeam
- **Competition Track:** 2026 Tencent Kaiwu Global AI Open Competition · D06 Legal AI Application Innovation & Practice
- **Development Tools:** CodeBuddy / Tencent Yuanqi / DeLi Open Platform API
- **Technical Form:** Lightweight Web App (HTML5 + CSS3 + Vanilla JS) + Tencent Yuanqi 5 dedicated agent API integration + Electron desktop packaging

---

## ⚖️ Legal Disclaimer

> **Disclaimer:** This agent provides legal information for reference only and does not constitute professional legal advice. Please consult a licensed attorney for specific rights protection matters.

### Useful Hotlines

- 📞 **National Labor Rights Protection Hotline:** 12333
- 📞 **Legal Aid Hotline:** 12348
- 📞 **Women's Rights Protection Hotline:** 12338

---

## 📄 License

This project is open-sourced under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Her Shield</strong> — Protecting every working woman's rights with technology 🌸
</p>

<p align="center">
  <em>So that no working woman feels alone when facing gender discrimination or sexual harassment—<br>
  Knowing what rights she has, what the other party is doing wrong, and what to do next.</em>
</p>

<p align="center">
  © SheSaysTeam
</p>
```
