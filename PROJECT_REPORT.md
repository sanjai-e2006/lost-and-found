# YoLost? - Lost and Found Management System for VIT Vellore

## 1. Title of Project
**YoLost? - Campus Lost and Found Management System**

---

## 2. Problem Statement
VIT Vellore students and staff frequently lose valuable items (electronics, documents, accessories) on campus. Currently, there is no centralized system to report lost items or claim found items, leading to:
- Items remaining unclaimed for extended periods
- Lack of transparency in the recovery process
- Difficulty in verifying legitimate ownership
- No secure record-keeping of lost/found transactions

---

## 3. Objectives
- **Centralized Platform**: Create a web-based system where users can report lost and found items
- **Secure Authentication**: Implement Google OAuth and email/password authentication for VIT students
- **Blockchain Verification**: Use blockchain technology to ensure tamper-proof records of all transactions
- **Smart Claims System**: Enable users to claim found items with proof verification
- **Campus Navigation**: Integrate Google Maps for location-based item tracking and campus navigation
- **Real-time Notifications**: Notify users when matching items are found or claimed
- **Administrative Controls**: Allow moderators to verify and approve claims

---

## 4. Hardware & Software Used

### **Hardware:**
- Development Machine: Standard PC/Laptop
- Server: Cloud-based hosting (Vercel)
- Database: Cloud PostgreSQL (Supabase)

### **Software:**
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6) | User interface and interactions |
| **Backend** | Node.js + Express.js | API server and routing |
| **Database** | PostgreSQL (Supabase) | User data, items, claims storage |
| **Authentication** | Supabase Auth + Google OAuth | Secure user authentication |
| **Blockchain** | Custom JavaScript Implementation | Immutable transaction records |
| **Maps** | Google Maps Embed API | Campus navigation and locations |
| **Hosting** | Vercel | Cloud deployment platform |
| **Version Control** | Git + GitHub | Code management |
| **IDE** | VS Code | Development environment |

---

## 5. Workflow / Block Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  (Login/Signup → Dashboard → Items → Map → Blockchain)          │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYER                          │
│        [Google OAuth] ←→ [Supabase Auth] ←→ [Email/Password]   │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LOGIC                           │
│  ┌────────────┬──────────────┬───────────────┬────────────────┐ │
│  │ Add Item   │ Claim Item   │ Notifications │ Map Navigation │ │
│  │ (Lost/     │ (with proof) │ (Real-time)   │ (VIT Campus)   │ │
│  │  Found)    │              │               │                │ │
│  └────────────┴──────────────┴───────────────┴────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────────┬───────────────────┬────────────────────┐  │
│  │  PostgreSQL DB   │  Blockchain Chain │  File Storage      │  │
│  │  (Users, Items,  │  (Proof-of-work,  │  (Supabase        │  │
│  │   Claims)        │   SHA-256 hash)   │   Storage)        │  │
│  └──────────────────┴───────────────────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

**Process Flow:**
1. User authenticates → Session created
2. User posts lost/found item → Stored in DB + Blockchain record
3. Another user finds matching item → Claims with proof
4. Notification sent to item owner
5. Owner approves/rejects claim → Blockchain verification
6. Item status updated → Transaction complete
```

---

## 6. Outcomes & Applications

### **Achieved Outcomes:**
✅ **Functional Web Application**: Fully deployed at https://lost-and-found-brown.vercel.app  
✅ **User Authentication**: Secure login with Google OAuth and email/password  
✅ **Item Management**: Users can add, view, edit, and delete lost/found items  
✅ **Claims System**: Users can claim items with proof upload (images/PDFs)  
✅ **Blockchain Integration**: All transactions recorded with immutable hash chains  
✅ **Notifications**: Real-time alerts for claims and status updates  
✅ **Campus Map**: Interactive VIT Vellore map with block-to-block navigation  
✅ **Responsive Design**: Mobile-friendly dark theme interface  
✅ **Data Security**: Row-level security policies in Supabase database  

### **Real-world Applications:**
- **Educational Institutions**: VIT Vellore, other universities and schools
- **Corporate Offices**: Employee lost and found management
- **Shopping Malls**: Centralized lost item recovery system
- **Transportation Hubs**: Airports, train stations, bus terminals
- **Hotels & Resorts**: Guest belongings management
- **Event Venues**: Conference centers, stadiums, concert halls

### **Future Enhancements:**
- AI-powered image recognition to match lost/found items automatically
- Mobile app (Android/iOS) for better accessibility
- SMS/WhatsApp notifications for instant alerts
- QR code generation for physical lost and found centers
- Multi-language support for international users
- Analytics dashboard for administrators

---

## 7. Key Features Summary

| Feature | Description | Technology Used |
|---------|-------------|----------------|
| **Authentication** | Google OAuth & Email/Password login | Supabase Auth |
| **Dashboard** | View all lost/found items, filter by category | JavaScript, CSS Grid |
| **Add Items** | Report lost or found items with images | File upload, Supabase Storage |
| **Claim System** | Claim items with proof verification | Multi-step form, approval workflow |
| **Blockchain** | Immutable record of all transactions | SHA-256 hashing, Proof-of-work |
| **Notifications** | Real-time alerts for claims and updates | Supabase real-time subscriptions |
| **Map View** | VIT campus navigation with building search | Google Maps Embed API |
| **Profile** | User profile management | Supabase database |
| **Help & Support** | FAQs and contact information | Static HTML/CSS |

---

## 8. Conclusion
YoLost? successfully addresses the problem of lost and found item management on VIT Vellore campus by providing a secure, transparent, and user-friendly digital platform. The integration of blockchain technology ensures data integrity, while the intuitive interface makes it accessible to all users. The system is scalable and can be adapted for various institutions and organizations worldwide.

---

**Project URL**: https://lost-and-found-brown.vercel.app  
**GitHub Repository**: https://github.com/sanjai-e2006/lost-and-found  
**Developed by**: Sanjai E (VIT Vellore)  
**Date**: October 2025
