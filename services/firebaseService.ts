import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { PhoneModel, OrderSubmission } from '../types';

// Firebase configuration - will be set via environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Initialize Firebase only if config is provided
let app: any = null;
let db: any = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const COLLECTIONS = {
  TEMPLATES: 'templates',
  ORDERS: 'orders'
};

// Check if Firebase is available
const isFirebaseAvailable = () => {
  return db !== null;
};

// Templates sync
export const syncTemplates = {
  // Save templates to Firebase
  save: async (templates: PhoneModel[]): Promise<void> => {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping cloud save');
      return;
    }

    try {
      const templatesDoc = doc(db, COLLECTIONS.TEMPLATES, 'all');
      await setDoc(templatesDoc, { 
        templates,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving templates to Firebase:', error);
      throw error;
    }
  },

  // Load templates from Firebase
  load: async (): Promise<PhoneModel[] | null> => {
    if (!isFirebaseAvailable()) {
      return null;
    }

    try {
      const templatesDoc = doc(db, COLLECTIONS.TEMPLATES, 'all');
      const docSnap = await getDoc(templatesDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.templates || [];
      }
      return null;
    } catch (error) {
      console.error('Error loading templates from Firebase:', error);
      return null;
    }
  },

  // Subscribe to real-time updates
  subscribe: (callback: (templates: PhoneModel[]) => void): (() => void) | null => {
    if (!isFirebaseAvailable()) {
      return null;
    }

    try {
      const templatesDoc = doc(db, COLLECTIONS.TEMPLATES, 'all');
      const unsubscribe = onSnapshot(templatesDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          callback(data.templates || []);
        }
      }, (error) => {
        console.error('Error in templates subscription:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up templates subscription:', error);
      return null;
    }
  }
};

// Orders sync
export const syncOrders = {
  // Save a single order to Firebase
  save: async (order: OrderSubmission): Promise<void> => {
    if (!isFirebaseAvailable()) {
      console.warn('Firebase not configured, skipping cloud save');
      return;
    }

    try {
      const orderDoc = doc(db, COLLECTIONS.ORDERS, order.id);
      await setDoc(orderDoc, {
        ...order,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error saving order to Firebase:', error);
      throw error;
    }
  },

  // Load all orders from Firebase
  load: async (): Promise<OrderSubmission[]> => {
    if (!isFirebaseAvailable()) {
      return [];
    }

    try {
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(ordersQuery);
      
      const orders: OrderSubmission[] = [];
      querySnapshot.forEach((doc) => {
        orders.push(doc.data() as OrderSubmission);
      });
      
      return orders;
    } catch (error) {
      console.error('Error loading orders from Firebase:', error);
      return [];
    }
  },

  // Delete an order from Firebase
  delete: async (orderId: string): Promise<void> => {
    if (!isFirebaseAvailable()) {
      return;
    }

    try {
      const orderDoc = doc(db, COLLECTIONS.ORDERS, orderId);
      await deleteDoc(orderDoc);
    } catch (error) {
      console.error('Error deleting order from Firebase:', error);
      throw error;
    }
  },

  // Subscribe to real-time updates
  subscribe: (callback: (orders: OrderSubmission[]) => void): (() => void) | null => {
    if (!isFirebaseAvailable()) {
      return null;
    }

    try {
      const ordersQuery = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('timestamp', 'desc')
      );
      
      const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
        const orders: OrderSubmission[] = [];
        querySnapshot.forEach((doc) => {
          orders.push(doc.data() as OrderSubmission);
        });
        callback(orders);
      }, (error) => {
        console.error('Error in orders subscription:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up orders subscription:', error);
      return null;
    }
  }
};

// Sync all orders (for bulk operations)
export const syncAllOrders = async (orders: OrderSubmission[]): Promise<void> => {
  if (!isFirebaseAvailable()) {
    return;
  }

  try {
    // Delete all existing orders first
    const ordersQuery = query(collection(db, COLLECTIONS.ORDERS));
    const querySnapshot = await getDocs(ordersQuery);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Save all new orders
    const savePromises = orders.map(order => syncOrders.save(order));
    await Promise.all(savePromises);
  } catch (error) {
    console.error('Error syncing all orders:', error);
    throw error;
  }
};

