# 📱 Application Monitoring System - MVP Detailed Plan (Firebase Only)

## 🎯 Project Overview

**Type:** Web Application (React + Firebase)  
**Architecture:** Firebase Backend (Firestore, Auth, Storage, Realtime DB, Cloud Functions)  
**Target Users:** Admin, Clients, Engineers, Technicians  
**Timeline:** MVP focused on core features

---

## 🏗️ System Architecture

### Tech Stack
- **Frontend:** React.js + TypeScript (responsive UI)
  - **UI Library:** shadcn/ui (Tailwind CSS + Radix UI)
  - **Styling:** Tailwind CSS
  - **Icons:** Lucide React
- **Backend:** Firebase (Serverless)
  - **Authentication:** Firebase Auth
  - **Database:** Cloud Firestore (main data)
  - **Real-time DB:** Firebase Realtime Database (monitoring)
  - **Storage:** Firebase Storage (files/images)
  - **Functions:** Cloud Functions (business logic)
  - **Messaging:** Firebase Cloud Messaging (notifications + remote control)
- **Maps:** Google Maps API
- **Payments:** Stripe/CIB integration (via Cloud Functions)

### Architecture Benefits for MVP
✅ No server management  
✅ Built-in authentication  
✅ Real-time updates out of the box  
✅ Automatic scaling  
✅ Reduced development time  
✅ Lower initial costs  

---

## 🗄️ Firebase Firestore Structure

### Collections & Documents

```
users/
├── {userId}
    ├── email: string
    ├── role: "admin" | "client" | "engineer" | "technician"
    ├── firstName: string
    ├── lastName: string
    ├── phone: string
    ├── address: string
    ├── city: string
    ├── photoURL: string
    ├── studentInfo: {
    │   ├── type: "license" | "master"
    │   ├── university: string
    │   ├── studentId: string
    │   }
    ├── permissions: array<string>
    ├── status: "active" | "inactive"
    ├── createdAt: timestamp
    └── updatedAt: timestamp

applications/
├── {appId}
    ├── name: string
    ├── category: string
    ├── description: string
    ├── features: array<string>
    ├── price: number
    ├── images: array<string>
    ├── materialsRequired: array<materialId>
    ├── techSpecs: object
    ├── status: "active" | "inactive"
    ├── createdAt: timestamp
    └── updatedAt: timestamp

materials/
├── {materialId}
    ├── name: string
    ├── category: string
    ├── description: string
    ├── price: number
    ├── imageUrl: string
    ├── specifications: object
    ├── stockQuantity: number
    ├── status: "available" | "out_of_stock"
    ├── createdAt: timestamp
    └── updatedAt: timestamp

applicationRequests/
├── {requestId}
    ├── clientId: string
    ├── engineerId: string | null
    ├── applicationId: string | null (if existing app)
    ├── domain: string
    ├── theme: string
    ├── description: string
    ├── requirements: object
    ├── features: array<string>
    ├── budget: number
    ├── deadline: timestamp
    ├── status: "pending" | "accepted" | "rejected" | "in_progress" | "completed"
    ├── attachments: array<string>
    ├── rejectionReason: string | null
    ├── progress: number (0-100)
    ├── milestones: array<{name, status, date}>
    ├── createdAt: timestamp
    └── updatedAt: timestamp

materialOrders/
├── {orderId}
    ├── clientId: string
    ├── items: array<{materialId, quantity, price}>
    ├── totalAmount: number
    ├── deliveryAddress: string
    ├── status: "pending" | "confirmed" | "delivered" | "cancelled"
    ├── paymentStatus: "pending" | "completed"
    ├── paymentMethod: "hand_to_hand" | "card"
    ├── createdAt: timestamp
    └── updatedAt: timestamp

maintenanceTickets/
├── {ticketId}
    ├── clientId: string
    ├── technicianId: string | null
    ├── applicationId: string
    ├── category: string
    ├── priority: "low" | "medium" | "high" | "urgent"
    ├── description: string
    ├── attachments: array<string>
    ├── status: "open" | "assigned" | "in_progress" | "resolved" | "closed"
    ├── resolutionNotes: string | null
    ├── createdAt: timestamp
    ├── resolvedAt: timestamp | null
    └── updatedAt: timestamp

payments/
├── {paymentId}
    ├── userId: string
    ├── requestId: string (applicationRequestId or orderId)
    ├── requestType: "application" | "material"
    ├── amount: number
    ├── paymentMethod: "hand_to_hand" | "card"
    ├── status: "pending" | "completed" | "failed"
    ├── transactionId: string | null
    ├── stripePaymentIntent: string | null
    ├── createdAt: timestamp
    └── completedAt: timestamp | null

conversations/
├── {conversationId}
    ├── participants: array<userId>
    ├── participantDetails: object {userId: {name, role, photo}}
    ├── lastMessage: string
    ├── lastMessageAt: timestamp
    ├── unreadCount: object {userId: number}
    └── createdAt: timestamp
    └── messages/ (subcollection)
        └── {messageId}
            ├── senderId: string
            ├── content: string
            ├── attachments: array<string>
            ├── readBy: array<userId>
            ├── createdAt: timestamp

notifications/
├── {userId}/ (subcollection per user)
    └── {notificationId}
        ├── type: string
        ├── title: string
        ├── message: string
        ├── link: string
        ├── read: boolean
        ├── createdAt: timestamp

appMonitoring/ (Realtime Database)
└── {appId}/
    ├── metrics/
    │   ├── activeUsers: number
    │   ├── cpuUsage: number
    │   ├── memoryUsage: number
    │   ├── errorCount: number
    │   └── lastUpdate: timestamp
    ├── logs/ (array of log entries)
    └── remoteControl/
        ├── command: string
        ├── status: string
        └── timestamp: timestamp
```

### Security Rules Strategy

**Firestore Rules:**
```javascript
// Users can read their own data
// Admins can read/write all users
// Engineers can read client data for their projects
// Technicians can read client data for their tickets

// Applications: public read, admin write
// Materials: public read, admin write
// Requests: owner + admin + assigned engineer
// Payments: owner + admin
// etc.
```

---

## 📄 Detailed Page Structure & Features

### 🌐 Public Pages (No Auth Required)

#### 1. Landing Page / Showroom
**Route:** `/`

**Components:**
- Hero section with animated gradient background
- Featured applications carousel (query top 6 from `applications` collection)
- Statistics counter (real-time from Firestore aggregation)
- Services overview cards
- How it works timeline
- CTA buttons (Get Started, Browse Apps)
- Footer with contact info

**Firestore Queries:**
```javascript
// Featured apps
db.collection('applications')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
  .limit(6)

// Stats (use Cloud Functions to aggregate)
db.collection('stats').doc('global').get()
```

**Features:**
- Responsive design (mobile-first)
- Smooth scroll animations
- Quick search bar
- Fast load time (<2s)

---

#### 2. Application Catalog
**Route:** `/apps`

**Layout:**
- Filter sidebar (sticky)
  - Category dropdown
  - Price range slider
  - Material requirements checkboxes
  - Sort by (newest, popular, price)
- Main grid (3 cols desktop, 2 tablet, 1 mobile)
- Pagination (10 per page)

**Application Card:**
- Thumbnail image
- Name & category badge
- Price tag
- Brief description (truncated)
- "View Details" button
- Favorite icon (if logged in)

**Firestore Queries:**
```javascript
// Base query
let query = db.collection('applications')
  .where('status', '==', 'active');

// Apply filters
if (category) query = query.where('category', '==', category);
if (priceRange) query = query.where('price', '>=', min).where('price', '<=', max);

// Sort
query = query.orderBy(sortField, sortDirection);

// Paginate
query = query.limit(10).startAfter(lastDoc);
```

**Features:**
- Real-time search (debounced)
- Filter state in URL params
- Loading skeletons
- Empty state message

---

#### 3. Application Detail Page
**Route:** `/apps/:appId`

**Layout:**
- Image gallery (main image + thumbnails)
- Right sidebar:
  - App name & category
  - Price badge
  - CTA: "Request This App"
  - Quick info cards (materials, delivery time)
- Description tabs:
  - Overview
  - Features (checklist)
  - Technical Specs
  - Compatible Materials
  - Reviews (future)

**Firestore Queries:**
```javascript
// App details
db.collection('applications').doc(appId).get()

// Related materials
db.collection('materials')
  .where(firebase.firestore.FieldPath.documentId(), 'in', app.materialsRequired)
  .get()
```

**Features:**
- Image zoom on hover
- Share button (social media)
- Related apps section
- Add to favorites (if logged in)

---

#### 4. Login Page
**Route:** `/login`

**Form:**
- Email input
- Password input
- Remember me checkbox
- Login button

**Firebase Auth:**
```javascript
await firebase.auth().signInWithEmailAndPassword(email, password);
// Get user role from Firestore
const userDoc = await db.collection('users').doc(user.uid).get();
const role = userDoc.data().role;
// Redirect based on role
```

**Features:**
- Form validation (Yup/Zod)
- Error handling (wrong password, user not found)
- Forgot password link
- Google sign-in button (optional)
- Loading state
- Redirect to appropriate dashboard after login

---

#### 5. Registration Page
**Route:** `/register`

**Multi-step Form:**

**Step 1: Account Type**
- Radio buttons: Student / Other
- Next button

**Step 2: Personal Info**
- First name, Last name
- Email (with format validation)
- Phone (with country code)
- Password (strength indicator)
- Confirm password

**Step 3: Additional Info**
- If Student:
  - University name (dropdown or text)
  - Level (License/Master radio)
  - Student ID
- Address
- City (dropdown)
- Profile photo upload (optional)

**Step 4: Review & Submit**
- Summary of all info
- Terms & conditions checkbox
- Submit button

**Firebase Implementation:**
```javascript
// 1. Create Auth user
const { user } = await firebase.auth()
  .createUserWithEmailAndPassword(email, password);

// 2. Create Firestore user document
await db.collection('users').doc(user.uid).set({
  email,
  role: 'client',
  firstName,
  lastName,
  phone,
  address,
  city,
  studentInfo: isStudent ? {...} : null,
  status: 'active',
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// 3. Upload photo to Storage (if provided)
if (photo) {
  const photoRef = firebase.storage().ref(`users/${user.uid}/profile.jpg`);
  await photoRef.put(photo);
  const photoURL = await photoRef.getDownloadURL();
  await db.collection('users').doc(user.uid).update({ photoURL });
}

// 4. Send welcome notification
await db.collection('notifications').doc(user.uid)
  .collection('items').add({
    type: 'welcome',
    title: 'Welcome!',
    message: 'Your account has been created successfully',
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
```

**Features:**
- Progress indicator
- Back button (except step 1)
- Client-side validation
- Duplicate email check
- Strong password requirements
- Image preview before upload
- Success animation
- Auto-redirect to dashboard

---

### 🔴 Admin Pages

#### 6. Admin Dashboard
**Route:** `/admin/dashboard`

**Layout:**
- Top stats row (4 cards)
  - Total Users (with breakdown icon)
  - Active Requests
  - Pending Tickets
  - Total Revenue
- Chart section (2 cols)
  - Users growth (line chart)
  - Revenue by month (bar chart)
- Recent activities (timeline)
- Quick actions panel

**Firestore Queries:**
```javascript
// Stats
const [users, requests, tickets, payments] = await Promise.all([
  db.collection('users').where('role', '==', 'client').get(),
  db.collection('applicationRequests').where('status', '==', 'pending').get(),
  db.collection('maintenanceTickets').where('status', '==', 'open').get(),
  db.collection('payments').where('status', '==', 'completed').get()
]);

// Recent activities (composite)
const activities = await db.collection('activities')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

**Real-time Listeners:**
```javascript
// Update stats in real-time
db.collection('applicationRequests')
  .where('status', '==', 'pending')
  .onSnapshot(snapshot => {
    setPendingRequests(snapshot.size);
  });
```

**Features:**
- Auto-refresh stats (every 30s)
- Date range filter for charts
- Export data button
- Responsive grid layout

---

#### 7. Engineers Management
**Route:** `/admin/engineers`

**Components:**
- Header with "Add Engineer" button
- Search bar
- Filters (status, specialization)
- Data table with columns:
  - Avatar
  - Name
  - Email
  - Phone
  - Active Projects
  - Status badge
  - Actions (edit, delete, view)
- Pagination

**Firestore Query:**
```javascript
db.collection('users')
  .where('role', '==', 'engineer')
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {
    const engineers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setEngineers(engineers);
  });

// Get project count for each engineer
engineers.forEach(async engineer => {
  const count = await db.collection('applicationRequests')
    .where('engineerId', '==', engineer.id)
    .where('status', 'in', ['accepted', 'in_progress'])
    .get();
  engineer.activeProjects = count.size;
});
```

**Add/Edit Engineer Modal:**
- Form fields:
  - First name, Last name
  - Email (disabled if editing)
  - Phone
  - Specialization (dropdown: Web, Mobile, Desktop, Full Stack)
  - Skills (multi-select tags)
  - Status toggle (Active/Inactive)
  - Permissions (checkboxes):
    - Can view all requests
    - Can accept requests
    - Can view client details
    - Can update project status
    - Can access monitoring

**Firebase Implementation:**
```javascript
// Create engineer
const { user } = await firebase.auth()
  .createUserWithEmailAndPassword(email, tempPassword);

await db.collection('users').doc(user.uid).set({
  email,
  role: 'engineer',
  firstName,
  lastName,
  phone,
  specialization,
  skills,
  permissions: selectedPermissions,
  status: 'active',
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Send email with credentials (via Cloud Function)
await firebase.functions().httpsCallable('sendCredentialsEmail')({
  email,
  tempPassword,
  role: 'engineer'
});

// Update engineer
await db.collection('users').doc(engineerId).update({
  firstName,
  lastName,
  phone,
  specialization,
  skills,
  permissions,
  status,
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

**Features:**
- Real-time updates
- Bulk actions (activate/deactivate)
- Export to CSV
- Delete confirmation dialog
- Success/error toasts

---

#### 8. Technicians Management
**Route:** `/admin/technicians`

**Similar structure to Engineers Management**

**Firestore Query:**
```javascript
db.collection('users')
  .where('role', '==', 'technician')
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {...});
```

**Add/Edit Technician Modal:**
- Form fields (similar to engineer)
  - Specialization: Hardware, Software, Network, General
  - Certifications (tags)
  - Permissions:
    - Can view all tickets
    - Can accept tickets
    - Can view client details
    - Can close tickets

**Features:**
- Active tickets count per technician
- Performance rating (future)
- Availability status

---

#### 9. Materials Management
**Route:** `/admin/materials`

**Layout:**
- Grid view / List view toggle
- Add Material button
- Search & filters (category, availability)
- Material cards showing:
  - Image (150x150)
  - Name
  - Category badge
  - Price
  - Stock status
  - Actions (edit, delete)

**Firestore Query:**
```javascript
db.collection('materials')
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {
    const materials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setMaterials(materials);
  });
```

**Add/Edit Material Modal:**
- Form:
  - Name
  - Category (dropdown: Sensors, Actuators, Controllers, etc.)
  - Image upload
  - Price (number)
  - Description (textarea)
  - Specifications (key-value pairs, dynamic)
    - Add spec button
    - Each spec: name + value
  - Stock quantity
  - Status (Available / Out of Stock)

**Firebase Implementation:**
```javascript
// Upload image
let imageUrl = existingImageUrl;
if (newImage) {
  const imageRef = firebase.storage()
    .ref(`materials/${Date.now()}_${newImage.name}`);
  await imageRef.put(newImage);
  imageUrl = await imageRef.getDownloadURL();
}

// Create/Update material
const materialData = {
  name,
  category,
  description,
  price,
  imageUrl,
  specifications,
  stockQuantity,
  status,
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
};

if (isNew) {
  materialData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
  await db.collection('materials').add(materialData);
} else {
  await db.collection('materials').doc(materialId).update(materialData);
}
```

**Features:**
- Image preview
- Drag & drop image upload
- Spec template presets
- Bulk update stock
- Low stock alerts

---

#### 10. System Permissions
**Route:** `/admin/permissions`

**Layout:**
- Role tabs (Engineer, Technician)
- Permission matrix table
  - Rows: Permission names
  - Columns: Can View, Can Create, Can Edit, Can Delete
- Save button (updates template)

**Firestore Structure:**
```javascript
// This is more for UI - actual permissions stored per user
db.collection('settings').doc('permissions').get()
// Returns:
{
  engineer: {
    requests: { view: true, accept: true, reject: true },
    clients: { view: true, edit: false },
    monitoring: { view: true, control: true }
  },
  technician: {
    tickets: { view: true, accept: true, close: true },
    clients: { view: true, edit: false }
  }
}
```

**Features:**
- Quick toggle all
- Permission description tooltips
- Apply template to all users button
- Audit log of permission changes

---

#### 11. All Requests Overview
**Route:** `/admin/requests`

**Tabs:**
1. Application Requests
2. Material Orders
3. Maintenance Tickets

**Application Requests Tab:**
- Filters: Status, Date range, Engineer
- Table columns:
  - Request ID
  - Client name
  - Domain
  - Budget
  - Status
  - Engineer (assign dropdown)
  - Date
  - Actions (view, assign)

**Firestore Queries:**
```javascript
// Application requests with client info
db.collection('applicationRequests')
  .orderBy('createdAt', 'desc')
  .onSnapshot(async snapshot => {
    const requests = await Promise.all(
      snapshot.docs.map(async doc => {
        const request = { id: doc.id, ...doc.data() };
        // Get client details
        const clientDoc = await db.collection('users')
          .doc(request.clientId).get();
        request.client = clientDoc.data();
        // Get engineer details if assigned
        if (request.engineerId) {
          const engineerDoc = await db.collection('users')
            .doc(request.engineerId).get();
          request.engineer = engineerDoc.data();
        }
        return request;
      })
    );
    setRequests(requests);
  });
```

**Request Detail Modal:**
- Client info card
- Request details
- Attachments
- Timeline of status changes
- Assignment section
  - Select engineer dropdown
  - Assign button
- Communication thread
- Admin notes (private)

**Features:**
- Bulk assign
- Status update
- Export requests
- Real-time updates
- Notification on new request

---

### 🔵 Client Pages

#### 12. Client Dashboard
**Route:** `/client/dashboard`

**Layout:**
- Welcome banner with user name
- Quick stats (3 cards)
  - Active Requests
  - Total Spent
  - Apps Owned
- My Requests section (tabs):
  - Applications (status cards)
  - Materials (order cards)
  - Maintenance (ticket cards)
- Recent notifications panel
- Quick action buttons (floating):
  - Request App
  - Order Materials
  - Get Maintenance

**Firestore Queries:**
```javascript
const currentUserId = firebase.auth().currentUser.uid;

// Active requests
db.collection('applicationRequests')
  .where('clientId', '==', currentUserId)
  .where('status', 'in', ['pending', 'accepted', 'in_progress'])
  .onSnapshot(snapshot => {
    setActiveRequests(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// Material orders
db.collection('materialOrders')
  .where('clientId', '==', currentUserId)
  .orderBy('createdAt', 'desc')
  .limit(5)
  .get();

// Maintenance tickets
db.collection('maintenanceTickets')
  .where('clientId', '==', currentUserId)
  .orderBy('createdAt', 'desc')
  .limit(5)
  .get();
```

**Status Card Component:**
- Icon based on type
- Request name/title
- Status badge
- Progress bar (if in progress)
- "View Details" button

**Features:**
- Real-time status updates
- Click card to view details
- Notification badge on new updates
- Responsive layout

---

#### 13. Client Profile
**Route:** `/client/profile`

**Tabs:**

**Tab 1: Personal Information**
- Avatar upload (click to change)
- Form fields (editable):
  - First name, Last name
  - Email (read-only)
  - Phone
  - Address, City
  - Student info (if applicable)
- Save button

**Firebase Implementation:**
```javascript
// Update profile
await db.collection('users').doc(userId).update({
  firstName,
  lastName,
  phone,
  address,
  city,
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Update avatar
if (newAvatar) {
  const avatarRef = firebase.storage()
    .ref(`users/${userId}/avatar.jpg`);
  await avatarRef.put(newAvatar);
  const photoURL = await avatarRef.getDownloadURL();
  await db.collection('users').doc(userId).update({ photoURL });
}
```

**Tab 2: Application History**
- List of all application requests
- Each item shows:
  - App name/domain
  - Status
  - Engineer name
  - Date requested
  - Progress percentage
  - View details button

**Tab 3: Payment History**
- Table with columns:
  - Date
  - Description
  - Amount
  - Payment method
  - Status
  - Receipt (download button)

**Firestore Query:**
```javascript
db.collection('payments')
  .where('userId', '==', currentUserId)
  .orderBy('createdAt', 'desc')
  .get();
```

**Tab 4: Maintenance History**
- List of past tickets
- Each shows:
  - Ticket ID
  - Application
  - Issue category
  - Status
  - Technician
  - Resolution date
  - View details

**Features:**
- Real-time updates
- Export data per tab
- Search within history
- Filter by date range

---

#### 14. Browse Applications (Client View)
**Route:** `/client/apps`

**Enhancements over public catalog:**
- Favorite button (saves to user doc)
- "Already Requested" badge
- Personalized recommendations (based on history)
- Direct "Request Now" button

**Firestore Queries:**
```javascript
// Get favorites
db.collection('users').doc(userId).get()
  .then(doc => doc.data().favoriteApps || []);

// Get recommended apps (Cloud Function)
firebase.functions().httpsCallable('getRecommendedApps')({ userId });

// Check if already requested
const myRequests = await db.collection('applicationRequests')
  .where('clientId', '==', userId)
  .get();
const requestedAppIds = myRequests.docs.map(doc => doc.data().applicationId);
```

**Features:**
- Toggle favorite (heart icon)
- "My Favorites" filter
- Request history indicator
- Save search preferences

---

#### 15. Request New Application
**Route:** `/client/request-app`

**Multi-step Form:**

**Step 1: Basic Info**
- Application domain (dropdown: E-commerce, Education, Healthcare, etc.)
- Theme/category (dropdown based on domain)
- Project name
- Target platform (checkboxes: Web, Mobile, Desktop)

**Step 2: Description**
- Detailed description (rich text editor)
- Key features needed (dynamic list, add/remove)
- Special requirements (textarea)

**Step 3: Technical Details**
- Required materials (multi-select from catalog)
- Budget range (slider)
- Preferred deadline (date picker)
- Similar app reference (URL input - optional)

**Step 4: Attachments**
- File upload area (drag & drop)
- Supported: PDF, DOC, images, ZIP
- Preview uploaded files
- Remove button per file

**Step 5: Review & Submit**
- Summary of all inputs
- Edit buttons per section
- Terms agreement checkbox
- Submit button

**Firebase Implementation:**
```javascript
// 1. Upload attachments
const attachmentUrls = await Promise.all(
  attachments.map(async file => {
    const fileRef = firebase.storage()
      .ref(`requests/${userId}/${Date.now()}_${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
  })
);

// 2. Create request
const requestRef = await db.collection('applicationRequests').add({
  clientId: userId,
  engineerId: null,
  applicationId: null,
  domain,
  theme,
  projectName,
  targetPlatform,
  description,
  features,
  requirements,
  materialsRequired,
  budget,
  deadline,
  referenceUrl,
  attachments: attachmentUrls,
  status: 'pending',
  progress: 0,
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// 3. Notify admins and available engineers
const admins = await db.collection('users')
  .where('role', '==', 'admin').get();
admins.forEach(admin => {
  db.collection('notifications').doc(admin.id)
    .collection('items').add({
      type: 'new_request',
      title: 'New Application Request',
      message: `${clientName} requested a new application`,
      link: `/admin/requests/${requestRef.id}`,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
});

// 4. Send FCM notification
await firebase.functions().httpsCallable('sendNewRequestNotification')({
  requestId: requestRef.id
});
```

**Features:**
- Save as draft
- Progress indicator
- Real-time validation
- File size limits
- Success animation
- Redirect to request tracking

---

#### 16. Request Materials
**Route:** `/client/materials`

**Layout:**
- Material catalog (grid view)
- Cart sidebar (sticky)
- Filters (category, price)
- Search bar

**Material Card (enhanced for ordering):**
- Image
- Name
- Price
- Stock status
- Quantity selector (+/- buttons)
- Add to cart button

**Cart Component:**
- Item list with:
  - Thumbnail
  - Name
  - Quantity (editable)
  - Price
  - Remove button
- Subtotal
- Proceed to checkout button

**Checkout Modal:**
- Order summary
- Delivery info form:
  - Address (pre-filled, editable)
  - Phone
  - Delivery notes
- Payment method selection:
  - Hand to hand
  - Card payment
- Place order button

**Firebase Implementation:**
```javascript
// Create order
const orderRef = await db.collection('materialOrders').add({
  clientId: userId,
  items: cartItems.map(item => ({
    materialId: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price
  })),
  totalAmount: calculateTotal(cartItems),
  deliveryAddress,
  deliveryPhone,
  deliveryNotes,
  status: 'pending',
  paymentStatus: 'pending',
  paymentMethod,
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Create payment record
await db.collection('payments').add({
  userId,
  requestId: orderRef.id,
  requestType: 'material',
  amount: totalAmount,
  paymentMethod,
  status: 'pending',
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// If card payment, create Stripe session (Cloud Function)
if (paymentMethod === 'card') {
  const { sessionId } = await firebase.functions()
    .httpsCallable('createStripeCheckout')({
      orderId: orderRef.id,
      amount: totalAmount
    });
  // Redirect to Stripe
  const stripe = window.Stripe(STRIPE_PUBLIC_KEY);
  stripe.redirectToCheckout({ sessionId });
}

// Notify admin
await db.collection('notifications').doc('admin')
  .collection('items').add({
    type: 'new_order',
    title: 'New Material Order',
    message: `Order #${orderRef.id} placed`,
    link: `/admin/orders/${orderRef.id}`,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
```

**Features:**
- Cart persistence (localStorage + Firestore)
- Stock validation
- Real-time price updates
- Order confirmation email
- Estimated delivery date

---

#### 17. Request Maintenance
**Route:** `/client/maintenance`

**Form:**
- Application selection (dropdown from owned apps)
- Issue category (dropdown):
  - Bug/Error
  - Feature Request
  - Performance Issue
  - Installation Help
  - Other
- Priority level (radio buttons):
  - Low (within 7 days)
  - Medium (within 3 days)
  - High (within 24 hours)
  - Urgent (immediate)
- Description (textarea with min 50 chars)
- Attachments (screenshots, logs, etc.)
- Preferred contact method (email/phone)

**Firebase Implementation:**
```javascript
// Upload attachments
const attachmentUrls = await Promise.all(
  files.map(async file => {
    const ref = firebase.storage()
      .ref(`maintenance/${userId}/${Date.now()}_${file.name}`);
    await ref.put(file);
    return await ref.getDownloadURL();
  })
);

// Create ticket
const ticketRef = await db.collection('maintenanceTickets').add({
  clientId: userId,
  technicianId: null,
  applicationId,
  category,
  priority,
  description,
  attachments: attachmentUrls,
  preferredContact,
  status: 'open',
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Auto-assign to available technician (Cloud Function)
await firebase.functions().httpsCallable('autoAssignTechnician')({
  ticketId: ticketRef.id,
  priority
});

// Notify technicians
const technicians = await db.collection('users')
  .where('role', '==', 'technician')
  .where('status', '==', 'active')
  .get();
  
technicians.forEach(tech => {
  db.collection('notifications').doc(tech.id)
    .collection('items').add({
      type: 'new_ticket',
      title: `New ${priority} Priority Ticket`,
      message: `Ticket #${ticketRef.id} - ${category}`,
      link: `/technician/tickets/${ticketRef.id}`,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
});
```

**Features:**
- Form validation
- File drag & drop
- Auto-save draft
- Priority badge preview
- Expected response time display
- Success message with ticket ID

---

#### 18. My Requests
**Route:** `/client/requests`

**Tabs:**

**Tab 1: Applications**
- Card layout for each request
- Each card shows:
  - Project name
  - Status badge (color-coded)
  - Progress bar (if accepted)
  - Engineer info (avatar, name)
  - Budget
  - Deadline
  - Last update date
  - Action buttons:
    - View Details
    - Message Engineer
    - Cancel (if pending)

**Firestore Query:**
```javascript
db.collection('applicationRequests')
  .where('clientId', '==', userId)
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setRequests(requests);
  });
```

**Detail Modal:**
- Full request details
- Timeline component showing:
  - Request submitted
  - Engineer assigned
  - Milestones completed
  - Status changes
- Files & attachments
- Comments/updates from engineer
- Add comment textarea
- Payment status section

**Tab 2: Materials**
- Table view
- Columns:
  - Order ID
  - Items (badge count)
  - Total amount
  - Status
  - Payment status
  - Date
  - Actions (view, track)

**Firestore Query:**
```javascript
db.collection('materialOrders')
  .where('clientId', '==', userId)
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {...});
```

**Tab 3: Maintenance**
- Card view
- Each card:
  - Ticket ID
  - Application name
  - Category & priority badges
  - Status
  - Assigned technician (if any)
  - Date opened
  - View details button

**Features:**
- Real-time status updates
- Filter by status
- Search requests
- Export list
- Quick actions (cancel, pay, message)

---

#### 19. Payment Portal
**Route:** `/client/payment/:requestId`

**Layout:**
- Payment summary card:
  - Request details
  - Amount breakdown
  - Total amount (large, prominent)
- Payment method selection:
  - Radio buttons:
    - Hand to hand (cash icon)
    - Card payment (card icon)

**Hand to Hand Flow:**
- Confirmation checkbox: "I confirm I will pay in person"
- Instructions text
- Submit button
- Creates payment record with status 'pending'

**Card Payment Flow:**
- Stripe Elements integration
- Card input fields (iframe)
- Billing address form
- Pay button

**Firebase Implementation:**
```javascript
// Get request details
const requestDoc = await db.collection('applicationRequests')
  .doc(requestId).get();
const request = requestDoc.data();

// Calculate amount (Cloud Function for dynamic pricing)
const { amount } = await firebase.functions()
  .httpsCallable('calculateRequestAmount')({ requestId });

// For card payment
if (method === 'card') {
  // Create Stripe payment intent
  const { clientSecret } = await firebase.functions()
    .httpsCallable('createPaymentIntent')({
      amount,
      requestId,
      userId
    });
  
  // Confirm payment with Stripe
  const { error } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: { ... }
    }
  });
  
  if (!error) {
    // Update payment status
    await db.collection('payments')
      .where('requestId', '==', requestId)
      .get()
      .then(snapshot => {
        snapshot.docs[0].ref.update({
          status: 'completed',
          transactionId: paymentIntent.id,
          completedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
  }
}

// For hand to hand
else {
  await db.collection('payments').add({
    userId,
    requestId,
    requestType: 'application',
    amount,
    paymentMethod: 'hand_to_hand',
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Update request payment status
await db.collection('applicationRequests').doc(requestId).update({
  paymentStatus: method === 'card' ? 'completed' : 'pending'
});
```

**Features:**
- Secure payment processing
- Receipt generation (PDF)
- Email confirmation
- Payment history link
- Error handling with retry
- Loading states

---

#### 20. Messaging Center
**Route:** `/client/messages`

**Layout:**
- Left sidebar: Conversation list
  - Search conversations
  - Each conversation item:
    - Avatar
    - Name & role badge
    - Last message preview
    - Timestamp
    - Unread badge
- Right panel: Active conversation
  - Header (name, status, actions)
  - Messages container
  - Message input with:
    - Text area
    - Emoji picker
    - File attachment button
    - Send button

**Firestore Queries:**
```javascript
// Get conversations
db.collection('conversations')
  .where('participants', 'array-contains', userId)
  .orderBy('lastMessageAt', 'desc')
  .onSnapshot(snapshot => {
    setConversations(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// Get messages for active conversation
db.collection('conversations').doc(conversationId)
  .collection('messages')
  .orderBy('createdAt', 'asc')
  .limit(50)
  .onSnapshot(snapshot => {
    setMessages(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// Mark as read
db.collection('conversations').doc(conversationId).update({
  [`unreadCount.${userId}`]: 0
});

messages.forEach(msg => {
  if (!msg.readBy.includes(userId)) {
    msg.ref.update({
      readBy: firebase.firestore.FieldValue.arrayUnion(userId)
    });
  }
});
```

**Send Message Implementation:**
```javascript
// Add message
await db.collection('conversations').doc(conversationId)
  .collection('messages').add({
    senderId: userId,
    content: messageText,
    attachments: attachmentUrls,
    readBy: [userId],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

// Update conversation
await db.collection('conversations').doc(conversationId).update({
  lastMessage: messageText,
  lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
  [`unreadCount.${otherUserId}`]: firebase.firestore.FieldValue.increment(1)
});

// Send FCM notification
await firebase.functions().httpsCallable('sendMessageNotification')({
  conversationId,
  recipientId: otherUserId,
  message: messageText
});
```

**Features:**
- Real-time messaging
- Typing indicator
- Message status (sent, delivered, read)
- File sharing (images, documents)
- Emoji support
- Message search
- Conversation archive
- Delete conversation

---

### 🟢 Engineer Pages

#### 21. Engineer Dashboard
**Route:** `/engineer/dashboard`

**Layout:**
- Welcome header with engineer name
- Stats cards:
  - Available Requests (pending)
  - My Projects (accepted/in progress)
  - Completed This Month
  - Client Satisfaction (rating)
- Available requests section:
  - Card grid (3 per row)
  - Each card:
    - Client name
    - Domain & theme
    - Budget badge
    - Deadline
    - Quick view button
    - Accept button
- My active projects:
  - List view
  - Project name, client, status, progress
  - Update button
- Calendar view (upcoming deadlines)

**Firestore Queries:**
```javascript
const engineerId = firebase.auth().currentUser.uid;

// Available requests
db.collection('applicationRequests')
  .where('status', '==', 'pending')
  .where('engineerId', '==', null)
  .orderBy('createdAt', 'desc')
  .onSnapshot(snapshot => {
    setAvailableRequests(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// My projects
db.collection('applicationRequests')
  .where('engineerId', '==', engineerId)
  .where('status', 'in', ['accepted', 'in_progress'])
  .onSnapshot(snapshot => {
    setMyProjects(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// Completed this month
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0,0,0,0);

db.collection('applicationRequests')
  .where('engineerId', '==', engineerId)
  .where('status', '==', 'completed')
  .where('updatedAt', '>=', startOfMonth)
  .get()
  .then(snapshot => setCompletedCount(snapshot.size));
```

**Features:**
- Quick accept from dashboard
- Real-time updates
- Filters (budget, domain, deadline)
- Calendar integration
- Notification preferences

---

#### 22. View Requests
**Route:** `/engineer/requests`

**Layout:**
- Filters sidebar:
  - Domain
  - Budget range
  - Deadline
  - Sort by (date, budget)
- Main area: Request cards
- Each card:
  - Client avatar & name
  - Request title
  - Domain & theme badges
  - Budget
  - Deadline
  - Brief description
  - Expand button
  - Accept/Reject buttons

**Expanded Request View (Modal):**
- Client information card
- Full request details
- Requirements checklist
- Materials needed (with links)
- Attachments download
- Similar projects (AI suggestions - future)
- Decision buttons:
  - Accept (opens confirmation)
  - Reject (requires reason)
  - Request More Info (opens message)

**Accept Request Flow:**
```javascript
await db.collection('applicationRequests').doc(requestId).update({
  engineerId,
  status: 'accepted',
  acceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Create conversation
const conversationRef = await db.collection('conversations').add({
  participants: [clientId, engineerId],
  participantDetails: {
    [clientId]: { name: clientName, role: 'client', photo: clientPhoto },
    [engineerId]: { name: engineerName, role: 'engineer', photo: engineerPhoto }
  },
  lastMessage: 'Request accepted',
  lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
  unreadCount: { [clientId]: 1, [engineerId]: 0 },
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Add initial message
await db.collection('conversations').doc(conversationRef.id)
  .collection('messages').add({
    senderId: engineerId,
    content: `I've accepted your request. Let's discuss the details!`,
    readBy: [engineerId],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

// Notify client
await db.collection('notifications').doc(clientId)
  .collection('items').add({
    type: 'request_accepted',
    title: 'Request Accepted!',
    message: `${engineerName} accepted your application request`,
    link: `/client/requests/${requestId}`,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

// Send FCM
await firebase.functions().httpsCallable('sendRequestAcceptedNotification')({
  requestId,
  clientId
});
```

**Reject Request Flow:**
- Modal with reason textarea
- Submit rejection
- Updates request status to 'rejected'
- Notifies client

**Features:**
- Filter by client location
- Save searches
- Request recommendations
- Batch actions
- Export requests

---

#### 23. My Projects
**Route:** `/engineer/projects`

**Layout:**
- Tabs: Active | Completed
- Active projects view:
  - Card layout
  - Each card:
    - Project name
    - Client info (avatar, name, contact)
    - Status badge
    - Progress bar
    - Milestones (completed/total)
    - Deadline countdown
    - Quick actions:
      - Update Status
      - Add Milestone
      - Message Client
      - View Details

**Project Detail Page:**
**Route:** `/engineer/projects/:projectId`

**Sections:**
1. **Header**
   - Project name
   - Client info card
   - Status selector
   - Progress percentage

2. **Requirements Tab**
   - Original request details
   - Checklist of features
   - Materials used
   - Technical specs

3. **Milestones Tab**
   - Timeline view
   - Each milestone:
     - Name
     - Description
     - Target date
     - Status (pending, in progress, completed)
     - Add new milestone button
   
4. **Files Tab**
   - Upload project files
   - Design mockups
   - Documentation
   - Code samples
   - Download links

5. **Communication Tab**
   - Embedded messages with client
   - Quick notes (private)
   - Status update history

6. **Monitoring Tab** (if app deployed)
   - Link to monitoring dashboard
   - Quick metrics
   - Remote control panel

**Firebase Implementation:**
```javascript
// Update project status
await db.collection('applicationRequests').doc(projectId).update({
  status: newStatus,
  progress: calculateProgress(milestones),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Add milestone
await db.collection('applicationRequests').doc(projectId).update({
  milestones: firebase.firestore.FieldValue.arrayUnion({
    id: Date.now(),
    name: milestoneName,
    description,
    targetDate,
    status: 'pending',
    createdAt: new Date()
  })
});

// Update milestone
const project = await db.collection('applicationRequests').doc(projectId).get();
const milestones = project.data().milestones;
const updatedMilestones = milestones.map(m => 
  m.id === milestoneId ? { ...m, status: 'completed', completedAt: new Date() } : m
);
await db.collection('applicationRequests').doc(projectId).update({
  milestones: updatedMilestones,
  progress: calculateProgress(updatedMilestones)
});

// Upload file
const fileRef = firebase.storage()
  .ref(`projects/${projectId}/${file.name}`);
await fileRef.put(file);
const fileUrl = await fileRef.getDownloadURL();

await db.collection('applicationRequests').doc(projectId).update({
  projectFiles: firebase.firestore.FieldValue.arrayUnion({
    name: file.name,
    url: fileUrl,
    type: file.type,
    uploadedAt: new Date(),
    uploadedBy: engineerId
  })
});
```

**Features:**
- Kanban board view option
- Gantt chart timeline
- Time tracking (hours worked)
- Export project report
- Clone milestone template
- Auto-save changes

---

#### 24. Client Information
**Route:** `/engineer/clients/:clientId`

**Sections:**
- Profile card:
  - Avatar
  - Name
  - Email, Phone
  - Location (with map pin)
  - Member since
  - Total projects with me
- Current projects tab
- Past projects tab
- Communication history
- Notes (private to engineer)
  - Add note textarea
  - Notes list with timestamps

**Firestore Queries:**
```javascript
// Client details
const clientDoc = await db.collection('users').doc(clientId).get();

// Projects with this client
db.collection('applicationRequests')
  .where('clientId', '==', clientId)
  .where('engineerId', '==', engineerId)
  .orderBy('createdAt', 'desc')
  .get();

// Engineer's private notes about client
db.collection('users').doc(engineerId)
  .collection('clientNotes')
  .doc(clientId)
  .get();
```

**Features:**
- Quick message button
- View on map
- Project timeline
- Add tags/labels
- Set reminders

---

#### 25. Engineer Profile
**Route:** `/engineer/profile`

**Tabs:**

**Tab 1: Personal Info**
- Editable fields
- Portfolio section:
  - Add completed projects
  - Project screenshots
  - Technologies used
  - Brief description

**Tab 2: Skills & Specialization**
- Skill tags (add/remove)
- Specialization (dropdown)
- Years of experience
- Certifications (upload)

**Tab 3: Statistics**
- Projects completed
- Average rating
- On-time delivery rate
- Response time average
- Client satisfaction chart
- Revenue generated

**Tab 4: Settings**
- Notification preferences
- Availability status
- Working hours
- Max concurrent projects
- Change password

**Firebase Queries:**
```javascript
// Portfolio
db.collection('users').doc(engineerId).get()
  .then(doc => doc.data().portfolio || []);

// Stats (aggregate via Cloud Function)
firebase.functions().httpsCallable('getEngineerStats')({ engineerId });

// Returns:
{
  totalProjects: 15,
  completedProjects: 12,
  averageRating: 4.8,
  onTimeRate: 0.92,
  averageResponseTime: '2 hours',
  totalRevenue: 50000
}
```

**Features:**
- Public profile view (shareable link)
- Export stats report
- Achievement badges
- Skill endorsements (future)

---

### 🟡 Technician Pages

#### 26. Technician Dashboard
**Route:** `/technician/dashboard`

**Layout:**
- Stats cards:
  - Open Tickets
  - Assigned to Me
  - Resolved Today
  - Average Resolution Time
- Priority tickets section:
  - Urgent tickets (red)
  - High priority tickets
  - Action needed
- My tickets list:
  - Ticket ID
  - Application
  - Client
  - Priority
  - Status
  - Age (time since opened)
  - Actions (view, update)
- Calendar view (scheduled maintenance)

**Firestore Queries:**
```javascript
const technicianId = firebase.auth().currentUser.uid;

// Open tickets
db.collection('maintenanceTickets')
  .where('status', '==', 'open')
  .orderBy('priority', 'desc')
  .orderBy('createdAt', 'asc')
  .onSnapshot(snapshot => {
    setOpenTickets(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// My assigned tickets
db.collection('maintenanceTickets')
  .where('technicianId', '==', technicianId)
  .where('status', 'in', ['assigned', 'in_progress'])
  .onSnapshot(snapshot => {
    setMyTickets(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });

// Resolved today
const today = new Date();
today.setHours(0,0,0,0);

db.collection('maintenanceTickets')
  .where('technicianId', '==', technicianId)
  .where('status', '==', 'resolved')
  .where('resolvedAt', '>=', today)
  .get()
  .then(snapshot => setResolvedToday(snapshot.size));
```

**Features:**
- Quick ticket accept
- Real-time updates
- Priority indicators
- SLA countdown timers
- Bulk status updates

---

#### 27. Maintenance Tickets
**Route:** `/technician/tickets`

**Layout:**
- Filter sidebar:
  - Status
  - Priority
  - Category
  - Date range
  - Application
- Main area: Ticket cards
- Each card:
  - Ticket ID & priority badge
  - Application name
  - Client info
  - Issue category
  - Description preview
  - Status
  - Age/SLA indicator
  - Actions (view, accept, reject)

**Ticket Detail Modal:**
- Header:
  - Ticket ID
  - Priority badge
  - Status
  - Created date
  - SLA timer
- Client section:
  - Name, contact info
  - Application details
  - Quick call/message buttons
- Issue details:
  - Category
  - Full description
  - Attachments (images, logs)
  - Download all button
- Resolution section:
  - Status update dropdown
  - Resolution notes textarea
  - Time spent input
  - Parts used (if hardware)
  - Close ticket button

**Accept Ticket Flow:**
```javascript
await db.collection('maintenanceTickets').doc(ticketId).update({
  technicianId,
  status: 'assigned',
  assignedAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Notify client
await db.collection('notifications').doc(clientId)
  .collection('items').add({
    type: 'ticket_assigned',
    title: 'Technician Assigned',
    message: `${technicianName} will handle your maintenance request`,
    link: `/client/requests?tab=maintenance&id=${ticketId}`,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
```

**Resolve Ticket Flow:**
```javascript
await db.collection('maintenanceTickets').doc(ticketId).update({
  status: 'resolved',
  resolutionNotes,
  timeSpent, // in minutes
  partsUsed: partsArray,
  resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Create resolution report (Cloud Function)
await firebase.functions().httpsCallable('generateResolutionReport')({
  ticketId
});

// Notify client
await db.collection('notifications').doc(clientId)
  .collection('items').add({
    type: 'ticket_resolved',
    title: 'Ticket Resolved',
    message: `Your maintenance ticket #${ticketId} has been resolved`,
    link: `/client/requests?tab=maintenance&id=${ticketId}`,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

// Request feedback (Cloud Function)
await firebase.functions().httpsCallable('sendFeedbackRequest')({
  ticketId,
  clientId
});
```

**Features:**
- Quick actions (call, message, navigate)
- Photo upload (before/after)
- Voice notes
- Signature capture (for completion)
- Export ticket report
- Reopen ticket option

---

#### 28. Client Information (Tech View)
**Route:** `/technician/clients/:clientId`

**Similar to Engineer's client view:**
- Profile card
- Applications owned
- Maintenance history with this client
- Communication thread
- Technician notes

**Firestore Queries:**
```javascript
// Client's applications (where they've requested maintenance)
db.collection('maintenanceTickets')
  .where('clientId', '==', clientId)
  .get()
  .then(snapshot => {
    const appIds = [...new Set(snapshot.docs.map(doc => doc.data().applicationId))];
    return db.collection('applications')
      .where(firebase.firestore.FieldPath.documentId(), 'in', appIds)
      .get();
  });

// Maintenance history
db.collection('maintenanceTickets')
  .where('clientId', '==', clientId)
  .where('technicianId', '==', technicianId)
  .orderBy('createdAt', 'desc')
  .get();
```

**Features:**
- Equipment/app list for client
- Recurring issues indicator
- Service history timeline
- Add equipment notes
- Schedule follow-up

---

#### 29. Technician Profile
**Route:** `/technician/profile`

**Tabs:**

**Tab 1: Personal Info**
- Basic details (editable)
- Certifications
- Specializations

**Tab 2: Skills**
- Technical skills tags
- Hardware expertise
- Software expertise
- Add/remove skills

**Tab 3: Statistics**
- Tickets resolved
- Average resolution time
- Customer rating
- Response time
- First-time fix rate
- Most common issues (chart)

**Tab 4: Schedule**
- Availability calendar
- Working hours
- Days off
- On-call status

**Features:**
- Public tech profile
- Skill verification
- Performance trends
- Export stats

---

### ⚙️ Shared/Cross-functional Pages

#### 30. Notifications Center
**Route:** `/notifications`

**Layout:**
- Header with "Mark all as read" button
- Filter tabs:
  - All
  - Unread
  - Requests
  - Payments
  - Messages
  - System
- Notification list:
  - Each item:
    - Icon (based on type)
    - Title
    - Message
    - Timestamp
    - Read/unread indicator
    - Click to navigate

**Firestore Query:**
```javascript
const userId = firebase.auth().currentUser.uid;

db.collection('notifications').doc(userId)
  .collection('items')
  .orderBy('createdAt', 'desc')
  .limit(50)
  .onSnapshot(snapshot => {
    setNotifications(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })));
  });
```

**Mark as Read:**
```javascript
await db.collection('notifications').doc(userId)
  .collection('items').doc(notificationId)
  .update({ read: true });

// Mark all as read
const batch = db.batch();
const unreadDocs = await db.collection('notifications').doc(userId)
  .collection('items')
  .where('read', '==', false)
  .get();
  
unreadDocs.forEach(doc => {
  batch.update(doc.ref, { read: true });
});
await batch.commit();
```

**Features:**
- Real-time updates
- Click notification to navigate
- Delete notification
- Filter by date range
- Notification preferences link
- Desktop notifications (FCM)

---

#### 31. App Monitoring Dashboard
**Route:** `/monitoring/:appId`
**Access:** Admin, Assigned Engineer

**Layout:**
- Header:
  - App name & icon
  - Status indicator (online/offline)
  - Last update timestamp
  - Refresh button
  - Remote control toggle

- Metrics Grid (real-time):
  - Active Users (live count)
  - CPU Usage (gauge chart)
  - Memory Usage (gauge chart)
  - Error Rate (line chart)
  - Response Time (area chart)
  - API Calls (bar chart)

- Logs Panel:
  - Real-time log stream
  - Filter by level (info, warning, error)
  - Search logs
  - Export logs button

- Remote Control Panel:
  - Status buttons:
    - Start App
    - Stop App
    - Restart App
  - Configuration:
    - Update settings remotely
    - Push notifications
    - Feature toggles
  - Command history

**Firebase Realtime Database Structure:**
```javascript
// Realtime DB path: /appMonitoring/{appId}
{
  status: 'online',
  metrics: {
    activeUsers: 45,
    cpuUsage: 32.5,
    memoryUsage: 68.2,
    errorCount: 3,
    responseTime: 245,
    apiCalls: 1250,
    lastUpdate: 1234567890
  },
  logs: [
    {
      timestamp: 1234567890,
      level: 'info',
      message: 'User logged in',
      userId: 'user123'
    },
    // ... more logs
  ],
  remoteControl: {
    lastCommand: 'restart',
    commandStatus: 'success',
    lastCommandAt: 1234567890
  }
}
```

**Implementation:**
```javascript
// Listen to real-time metrics
const metricsRef = firebase.database().ref(`appMonitoring/${appId}/metrics`);
metricsRef.on('value', snapshot => {
  setMetrics(snapshot.val());
});

// Listen to logs
const logsRef = firebase.database().ref(`appMonitoring/${appId}/logs`);
logsRef.limitToLast(100).on('child_added', snapshot => {
  setLogs(prevLogs => [...prevLogs, snapshot.val()]);
});

// Send remote control command
const sendCommand = async (command) => {
  await firebase.database().ref(`appMonitoring/${appId}/remoteControl`).set({
    command,
    status: 'pending',
    sentAt: Date.now(),
    sentBy: userId
  });
  
  // Send FCM to client app
  await firebase.functions().httpsCallable('sendRemoteCommand')({
    appId,
    command
  });
  
  // Log activity
  await db.collection('monitoringLogs').add({
    appId,
    userId,
    action: 'remote_command',
    command,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
};
```

**Features:**
- Auto-refresh every 5 seconds
- Historical data (last 24h, 7d, 30d)
- Alert thresholds configuration
- Export metrics report
- Embedded charts (Chart.js)
- Fullscreen mode
- Compare time periods

---

#### 32. Client Location Map
**Route:** `/map`
**Access:** Admin, Engineers (for their clients)

**Layout:**
- Full-screen Google Map
- Sidebar with client list
- Map markers for each client
- Cluster markers for nearby clients

**Components:**
- Search bar (search clients)
- Filters:
  - Active clients
  - By city
  - By engineer (admin view)
- Client marker info window:
  - Name
  - Address
  - Phone
  - Active projects count
  - "View Profile" button
  - "Get Directions" button

**Firestore Implementation:**
```javascript
// Get all clients with coordinates
const clientsQuery = role === 'admin' 
  ? db.collection('users').where('role', '==', 'client')
  : db.collection('applicationRequests')
      .where('engineerId', '==', userId)
      .get()
      .then(async snapshot => {
        const clientIds = [...new Set(snapshot.docs.map(doc => doc.data().clientId))];
        return db.collection('users')
          .where(firebase.firestore.FieldPath.documentId(), 'in', clientIds)
          .get();
      });

clientsQuery.onSnapshot(snapshot => {
  const clients = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Geocode addresses if no coordinates
  clients.forEach(async client => {
    if (!client.coordinates && client.address) {
      const { lat, lng } = await geocodeAddress(client.address);
      await db.collection('users').doc(client.id).update({
        coordinates: new firebase.firestore.GeoPoint(lat, lng)
      });
    }
  });
  
  setClients(clients);
});
```

**Google Maps Integration:**
```javascript
// Initialize map
const map = new google.maps.Map(mapRef.current, {
  center: { lat: 35.6976, lng: -0.6337 }, // Oran, Algeria
  zoom: 12
});

// Add markers
clients.forEach(client => {
  const marker = new google.maps.Marker({
    position: { lat: client.coordinates.latitude, lng: client.coordinates.longitude },
    map,
    title: client.firstName + ' ' + client.lastName,
    icon: {
      url: client.photoURL || defaultAvatar,
      scaledSize: new google.maps.Size(40, 40)
    }
  });
  
  // Info window
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div style="padding: 10px;">
        <h3>${client.firstName} ${client.lastName}</h3>
        <p>${client.address}</p>
        <p>${client.phone}</p>
        <button onclick="viewClient('${client.id}')">View Profile</button>
      </div>
    `
  });
  
  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });
});

// Marker clustering
const markerCluster = new MarkerClusterer(map, markers, {
  imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
});
```

**Features:**
- Heat map view (client density)
- Route planning (visit multiple clients)
- Draw service area
- Filter by distance from location
- Export client locations
- Street view integration
- Traffic layer toggle

---

#### 33. Reports & Analytics
**Route:** `/reports`
**Access:** Admin

**Layout:**
- Date range selector (top)
- Quick filters (Last 7 days, Last 30 days, Custom)
- Export button (PDF, Excel)

**Report Sections:**

**1. Overview Dashboard**
- KPI cards:
  - Total Revenue
  - New Clients
  - Completed Projects
  - Active Tickets
- Revenue chart (line)
- Projects by status (pie)
- Client growth (area chart)

**2. Financial Reports**
- Revenue breakdown:
  - By payment method
  - By service type (apps, materials, maintenance)
  - By month
- Pending payments
- Refunds/cancellations
- Payment success rate

**3. User Analytics**
- User registrations over time
- Active users (DAU, MAU)
- User segmentation (students vs others)
- User retention rate
- Churn analysis

**4. Project Analytics**
- Projects by domain
- Average project duration
- On-time completion rate
- Client satisfaction scores
- Engineer performance comparison
- Most requested features

**5. Maintenance Reports**
- Tickets by category
- Resolution time average
- Technician performance
- Recurring issues
- SLA compliance
- Client satisfaction by technician

**6. Engineer Performance**
- Table with columns:
  - Engineer name
  - Projects completed
  - Average rating
  - On-time rate
  - Response time
  - Revenue generated
- Top performers (leaderboard)
- Individual drill-down

**7. Material Sales**
- Best-selling materials
- Inventory turnover
- Low stock alerts
- Revenue by material category
- Order frequency

**Firebase/Cloud Function Implementation:**
```javascript
// Generate report (Cloud Function)
firebase.functions().httpsCallable('generateReport')({
  reportType: 'financial',
  startDate,
  endDate
}).then(result => {
  setReportData(result.data);
});

// Cloud Function aggregates data from Firestore
exports.generateReport = functions.https.onCall(async (data, context) => {
  const { reportType, startDate, endDate } = data;
  
  // Query relevant collections
  const payments = await db.collection('payments')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .where('status', '==', 'completed')
    .get();
  
  const totalRevenue = payments.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
  
  const revenueByMethod = {};
  payments.docs.forEach(doc => {
    const method = doc.data().paymentMethod;
    revenueByMethod[method] = (revenueByMethod[method] || 0) + doc.data().amount;
  });
  
  // More aggregations...
  
  return {
    totalRevenue,
    revenueByMethod,
    // ... more data
  };
});
```

**Features:**
- Scheduled reports (email daily/weekly)
- Custom report builder
- Compare periods
- Drill-down capabilities
- Share reports with team
- Save report templates
- Real-time data updates
- Interactive charts (hover, click)

---

#### 34. Settings
**Route:** `/settings`

**Tabs:**

**Tab 1: Profile Settings**
- Avatar upload
- Personal info (name, email, phone)
- Address, city
- Save button

**Tab 2: Account Security**
- Change password form
- Two-factor authentication:
  - Enable/disable toggle
  - Setup QR code
  - Backup codes
- Active sessions list
- Login history

**Tab 3: Notifications**
- Email notifications:
  - New messages
  - Request updates
  - Payment confirmations
  - System alerts
- Push notifications:
  - Desktop
  - Mobile
- Notification frequency (instant, daily digest)

**Tab 4: Privacy**
- Profile visibility (public/private)
- Show phone number
- Show email
- Location sharing
- Data export (download all data)
- Delete account (with confirmation)

**Tab 5: Preferences**
- Language (French, Arabic - future)
- Timezone
- Date format
- Currency
- Theme (light/dark)

**Tab 6: System (Admin only)**
- Platform settings
- Payment gateway configuration
- Email templates
- Feature flags
- API keys management
- Backup & restore

**Firebase Implementation:**
```javascript
// Update settings
await db.collection('users').doc(userId).update({
  settings: {
    notifications: {
      email: emailNotifSettings,
      push: pushNotifSettings
    },
    privacy: privacySettings,
    preferences: preferenceSettings
  },
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Enable 2FA
const secret = speakeasy.generateSecret();
await db.collection('users').doc(userId).update({
  twoFactorSecret: secret.base32,
  twoFactorEnabled: false // Will be true after verification
});

// Return QR code
const qrCode = await QRCode.toDataURL(secret.otpauth_url);
return qrCode;

// Verify 2FA
const verified = speakeasy.totp.verify({
  secret: user.twoFactorSecret,
  encoding: 'base32',
  token: userToken
});

if (verified) {
  await db.collection('users').doc(userId).update({
    twoFactorEnabled: true
  });
}

// Data export (Cloud Function)
firebase.functions().httpsCallable('exportUserData')({ userId })
  .then(result => {
    // Download JSON file
    const blob = new Blob([JSON.stringify(result.data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-data-${Date.now()}.json`;
    a.click();
  });
```

**Features:**
- Auto-save preferences
- Reset to defaults
- Import/export settings
- Activity log
- Connected devices
- API access tokens (for developers)

---

## 🎨 UI/UX Components Library (shadcn/ui)

### Core Components from shadcn/ui

**1. Navigation Components**
```typescript
// shadcn/ui components to use:
- NavigationMenu (for navbar links)
- Menubar (for top navigation)
- DropdownMenu (for user avatar menu)
- Sheet (for mobile sidebar)
- Separator (for dividers)
- Badge (for notification counts)
- Avatar (for user profiles)
- Command (for search bar - ⌘K menu)

// Custom Navigation Components
- Navbar (using NavigationMenu + DropdownMenu)
- Sidebar (using Sheet + ScrollArea)
- MobileNav (using Sheet)
- Breadcrumb (using custom + Separator)
```

**2. Form Components**
```typescript
// shadcn/ui form components:
- Form (with react-hook-form + zod validation)
- Input (for text, email, number)
- Textarea (for multiline text)
- Select (for dropdowns)
- Checkbox (for checkboxes)
- RadioGroup (for radio buttons)
- Switch (for toggles)
- Slider (for range inputs)
- Calendar (for date picker)
- DatePicker (Calendar + Popover)
- Label (for form labels)

// Additional components to add:
- PhoneInput (custom with react-phone-number-input)
- PasswordInput (Input + Eye icon toggle)
- RichTextEditor (Tiptap integration)
- DateRangePicker (custom using Calendar)
- ColorPicker (custom or library)
- FileUpload (custom drag & drop with Input type="file")
- ImageUpload (custom with cropping)
- AvatarUpload (Avatar + FileUpload)
```

**3. Data Display Components**
```typescript
// shadcn/ui components:
- Table (for data tables)
- Card (for containers)
- Badge (for status, tags)
- Progress (for progress bars)
- Skeleton (for loading states)
- ScrollArea (for scrollable content)
- Separator (for dividers)
- HoverCard (for hover tooltips)
- Tooltip (for hints)

// Custom Data Display:
- DataTable (Table + sorting/filtering/pagination)
- StatCard (Card + custom styling)
- UserCard (Card + Avatar + Badge)
- ProjectCard (Card + Progress + Badge)
- Timeline (custom component)
- ConversationList (ScrollArea + custom items)
- NotificationList (ScrollArea + custom items)

// Charts (using Recharts):
- LineChart
- BarChart
- PieChart
- AreaChart
- RadarChart
- ComposedChart
```

**4. Feedback Components**
```typescript
// shadcn/ui components:
- Toast (for notifications using sonner)
- Alert (for alert messages)
- AlertDialog (for confirmations)
- Dialog (for modals)
- Popover (for popovers)
- Drawer (for side panels)

// Custom Feedback:
- ConfirmDialog (AlertDialog customized)
- FormModal (Dialog + Form)
- DetailModal (Dialog + ScrollArea)
- ImagePreviewModal (Dialog + Image)
- EmptyState (custom with illustration)
- ErrorState (Alert + custom styling)
- SuccessAnimation (custom or Lottie)
```

**5. Navigation & Layout Elements**
```typescript
// shadcn/ui components:
- Tabs (for tabbed content)
- Accordion (for collapsible sections)
- Collapsible (for expandable content)
- ResizablePanel (for split layouts)

// Custom Navigation:
- Pagination (custom using Button)
- Breadcrumb (custom navigation)
- Stepper (custom multi-step indicator)
```

### shadcn/ui Setup & Configuration

**Installation:**
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
# ... and more
```

**Theme Configuration (tailwind.config.js):**
```javascript
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## 🔐 Authentication & Authorization

### Firebase Auth Setup

```javascript
// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
};

firebase.initializeApp(firebaseConfig);
```

### Auth Flow

```javascript
// 1. User logs in
const { user } = await firebase.auth().signInWithEmailAndPassword(email, password);

// 2. Get user document with role
const userDoc = await db.collection('users').doc(user.uid).get();
const userData = userDoc.data();

// 3. Set auth context
setAuthUser({
  uid: user.uid,
  email: user.email,
  role: userData.role,
  ...userData
});

// 4. Redirect based on role
switch (userData.role) {
  case 'admin':
    navigate('/admin/dashboard');
    break;
  case 'client':
    navigate('/client/dashboard');
    break;
  case 'engineer':
    navigate('/engineer/dashboard');
    break;
  case 'technician':
    navigate('/technician/dashboard');
    break;
}
```

### Protected Routes

```javascript
// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { authUser, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  if (!authUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(authUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

// Usage
<Route 
  path="/admin/*" 
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout />
    </ProtectedRoute>
  } 
/>
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function isAdmin() {
      return getUserRole() == 'admin';
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone can read their own document, admins can read all
      allow read: if isOwner(userId) || isAdmin();
      // Only user can update their own document, admins can update all
      allow update: if isOwner(userId) || isAdmin();
      // Only admins can create users (via Cloud Functions)
      allow create: if isAdmin();
      // Only admins can delete
      allow delete: if isAdmin();
      
      // Subcollections
      match /clientNotes/{noteId} {
        allow read, write: if isAuthenticated();
      }
    }
    
    // Applications collection
    match /applications/{appId} {
      // Anyone can read (public catalog)
      allow read: if true;
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // Materials collection
    match /materials/{materialId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Application requests
    match /applicationRequests/{requestId} {
      allow read: if isAuthenticated() && (
        isAdmin() ||
        isOwner(resource.data.clientId) ||
        request.auth.uid == resource.data.engineerId ||
        getUserRole() == 'engineer' // Engineers can see pending requests
      );
      allow create: if isAuthenticated() && getUserRole() == 'client';
      allow update: if isAuthenticated() && (
        isAdmin() ||
        isOwner(resource.data.clientId) ||
        request.auth.uid == resource.data.engineerId
      );
      allow delete: if isAdmin();
    }
    
    // Material orders
    match /materialOrders/{orderId} {
      allow read: if isAuthenticated() && (
        isAdmin() || isOwner(resource.data.clientId)
      );
      allow create: if isAuthenticated() && getUserRole() == 'client';
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }
    
    // Maintenance tickets
    match /maintenanceTickets/{ticketId} {
      allow read: if isAuthenticated() && (
        isAdmin() ||
        isOwner(resource.data.clientId) ||
        request.auth.uid == resource.data.technicianId ||
        getUserRole() == 'technician'
      );
      allow create: if isAuthenticated() && getUserRole() == 'client';
      allow update: if isAuthenticated() && (
        isAdmin() ||
        request.auth.uid == resource.data.technicianId
      );
      allow delete: if isAdmin();
    }
    
    // Payments
    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (
        isAdmin() || isOwner(resource.data.userId)
      );
      allow create: if isAuthenticated();
      allow update: if isAdmin(); // Only admin can confirm payments
      allow delete: if isAdmin();
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        request.auth.uid in resource.data.participants;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      }
    }
    
    // Notifications
    match /notifications/{userId}/items/{notificationId} {
      allow read, write: if isOwner(userId);
    }
    
    // Monitoring logs (admin only)
    match /monitoringLogs/{logId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

### Realtime Database Rules

```json
{
  "rules": {
    "appMonitoring": {
      "$appId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "remoteControl": {
          ".read": "auth != null",
          ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'engineer'"
        }
      }
    }
  }
}
```

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // User avatars
    match /users/{userId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isOwner(userId);
    }
    
    // Materials images
    match /materials/{allPaths=**} {
      allow read: if true; // Public
      allow write: if isAuthenticated(); // Admins only (enforced in app)
    }
    
    // Application requests
    match /requests/{userId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isOwner(userId);
    }
    
    // Project files
    match /projects/{projectId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
    
    // Maintenance attachments
    match /maintenance/{userId}/{allPaths=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isOwner(userId);
    }
  }
}
```

---

## ☁️ Cloud Functions

### Required Cloud Functions

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// 1. Send credentials email to new engineers/technicians
exports.sendCredentialsEmail = functions.https.onCall(async (data, context) => {
  const { email, tempPassword, role } = data;
  
  // Send email using SendGrid/Mailgun
  await sendEmail({
    to: email,
    subject: 'Your Account Credentials',
    template: 'credentials',
    data: { email, tempPassword, role }
  });
  
  return { success: true };
});

// 2. Auto-assign technician to urgent tickets
exports.autoAssignTechnician = functions.https.onCall(async (data, context) => {
  const { ticketId, priority } = data;
  
  // Get available technicians
  const technicians = await db.collection('users')
    .where('role', '==', 'technician')
    .where('status', '==', 'active')
    .get();
  
  // Find technician with least active tickets
  let assignedTech = null;
  let minTickets = Infinity;
  
  for (const tech of technicians.docs) {
    const activeTickets = await db.collection('maintenanceTickets')
      .where('technicianId', '==', tech.id)
      .where('status', 'in', ['assigned', 'in_progress'])
      .get();
    
    if (activeTickets.size < minTickets) {
      minTickets = activeTickets.size;
      assignedTech = tech;
    }
  }
  
  if (assignedTech && priority === 'urgent') {
    await db.collection('maintenanceTickets').doc(ticketId).update({
      technicianId: assignedTech.id,
      status: 'assigned',
      assignedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  return { assignedTo: assignedTech?.id };
});

// 3. Create Stripe payment intent
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  const { amount, requestId, userId } = data;
  const stripe = require('stripe')(functions.config().stripe.secret_key);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'dzd',
    metadata: { requestId, userId }
  });
  
  return { clientSecret: paymentIntent.client_secret };
});

// 4. Send remote command to client app
exports.sendRemoteCommand = functions.https.onCall(async (data, context) => {
  const { appId, command } = data;
  
  // Get app's FCM token from Firestore
  const appDoc = await db.collection('applications').doc(appId).get();
  const fcmToken = appDoc.data().fcmToken;
  
  if (fcmToken) {
    await admin.messaging().send({
      token: fcmToken,
      data: {
        type: 'remote_command',
        command,
        timestamp: Date.now().toString()
      }
    });
  }
  
  return { success: true };
});

// 5. Generate reports
exports.generateReport = functions.https.onCall(async (data, context) => {
  const { reportType, startDate, endDate } = data;
  
  // Aggregate data based on report type
  // Implementation varies by report...
  
  return { reportData };
});

// 6. Geocode address
exports.geocodeAddress = functions.https.onCall(async (data, context) => {
  const { address } = data;
  const googleMapsClient = require('@google/maps').createClient({
    key: functions.config().google.maps_key
  });
  
  return new Promise((resolve, reject) => {
    googleMapsClient.geocode({ address }, (err, response) => {
      if (err) reject(err);
      const { lat, lng } = response.json.results[0].geometry.location;
      resolve({ lat, lng });
    });
  });
});

// 7. On new user registration (trigger)
exports.onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();
    
    // Create notification document
    await db.collection('notifications').doc(userId)
      .collection('items').add({
        type: 'welcome',
        title: 'Welcome!',
        message: `Welcome to App Monitoring System, ${userData.firstName}!`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Send welcome email
    await sendEmail({
      to: userData.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: userData
    });
  });

// 8. On request status change (trigger)
exports.onRequestStatusChange = functions.firestore
  .document('applicationRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    if (before.status !== after.status) {
      const requestId = context.params.requestId;
      const clientId = after.clientId;
      
      // Notify client
      await db.collection('notifications').doc(clientId)
        .collection('items').add({
          type: 'request_status',
          title: 'Request Status Updated',
          message: `Your request status changed to ${after.status}`,
          link: `/client/requests/${requestId}`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      
      // Send FCM
      const userDoc = await db.collection('users').doc(clientId).get();
      const fcmToken = userDoc.data().fcmToken;
      
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: 'Request Status Updated',
            body: `Your request status changed to ${after.status}`
          },
          data: {
            type: 'request_status',
            requestId
          }
        });
      }
    }
  });

// 9. Export user data (GDPR compliance)
exports.exportUserData = functions.https.onCall(async (data, context) => {
  const { userId } = data;
  
  // Collect all user data
  const userData = await db.collection('users').doc(userId).get();
  const requests = await db.collection('applicationRequests')
    .where('clientId', '==', userId).get();
  const payments = await db.collection('payments')
    .where('userId', '==', userId).get();
  // ... more collections
  
  return {
    profile: userData.data(),
    requests: requests.docs.map(doc => doc.data()),
    payments: payments.docs.map(doc => doc.data()),
    // ... more data
  };
});

// 10. Scheduled function: Daily stats aggregation
exports.dailyStatsAggregation = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Aggregate stats for the day
    const requests = await db.collection('applicationRequests')
      .where('createdAt', '>=', today)
      .get();
    
    const payments = await db.collection('payments')
      .where('createdAt', '>=', today)
      .where('status', '==', 'completed')
      .get();
    
    const revenue = payments.docs.reduce((sum, doc) => 
      sum + doc.data().amount, 0);
    
    // Store aggregated stats
    await db.collection('dailyStats').add({
      date: today,
      totalRequests: requests.size,
      totalRevenue: revenue,
      // ... more stats
    });
  });
```

---

## 🚀 MVP Development Roadmap

### Phase 1: Foundation (Week 1-2)
**Deliverables:**
- [x] Firebase project setup
- [x] React project initialization (Vite + TypeScript)
- [x] Firestore database structure
- [x] Firebase Auth integration
- [x] Basic routing (React Router)
- [x] shadcn/ui + Tailwind CSS setup
- [x] Context API for state management
- [x] Environment configuration

**Tasks:**
1. Create Firebase project
2. Set up Firestore collections
3. Configure Security Rules (basic)
4. Initialize React + TypeScript app with Vite
5. Install dependencies (React Router, Firebase, etc.)
6. Initialize shadcn/ui and Tailwind CSS
7. Add core shadcn/ui components (Button, Form, Input, Card, etc.)
8. Create folder structure
9. Set up theme configuration (dark/light mode)
10. Set up AuthContext
11. Implement login/register pages with shadcn/ui forms