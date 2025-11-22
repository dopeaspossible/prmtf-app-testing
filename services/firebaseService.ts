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

// Check if Firebase is disabled due to quota
const FIREBASE_DISABLED_KEY = 'casecraft_firebase_disabled';

const isFirebaseDisabled = (): boolean => {
  try {
    return localStorage.getItem(FIREBASE_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
};

const setFirebaseDisabled = (disabled: boolean): void => {
  try {
    if (disabled) {
      localStorage.setItem(FIREBASE_DISABLED_KEY, 'true');
    } else {
      localStorage.removeItem(FIREBASE_DISABLED_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

// Check if Firebase is available and not disabled
const isFirebaseAvailable = () => {
  return db !== null && !isFirebaseDisabled();
};

// Check if error is a quota/resource exhaustion error
const isQuotaError = (error: any): boolean => {
  if (!error) return false;
  
  const errorCode = error.code || error.message || '';
  const errorString = String(errorCode).toLowerCase();
  
  // Firebase quota error codes
  return (
    errorString.includes('quota') ||
    errorString.includes('resource-exhausted') ||
    errorString.includes('resource_exhausted') ||
    errorString === '8' || // RESOURCE_EXHAUSTED
    errorString.includes('429') || // HTTP 429 Too Many Requests
    errorString.includes('too many requests') ||
    errorString.includes('billing') ||
    errorString.includes('quota-exceeded')
  );
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
      if (isQuotaError(error)) {
        console.warn('Firebase quota exceeded, disabling Firebase and switching to localStorage');
        setFirebaseDisabled(true);
        // Dispatch event to notify app
        window.dispatchEvent(new CustomEvent('firebase-quota-exceeded', { 
          detail: { type: 'templates' } 
        }));
      }
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
        if (isQuotaError(error)) {
          console.warn('Firebase quota exceeded in subscription, disabling Firebase');
          setFirebaseDisabled(true);
          window.dispatchEvent(new CustomEvent('firebase-quota-exceeded', { 
            detail: { type: 'templates' } 
          }));
        }
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
      if (isQuotaError(error)) {
        console.warn('Firebase quota exceeded, disabling Firebase and switching to localStorage');
        setFirebaseDisabled(true);
        // Dispatch event to notify app
        window.dispatchEvent(new CustomEvent('firebase-quota-exceeded', { 
          detail: { type: 'orders' } 
        }));
      }
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
        if (isQuotaError(error)) {
          console.warn('Firebase quota exceeded in subscription, disabling Firebase');
          setFirebaseDisabled(true);
          window.dispatchEvent(new CustomEvent('firebase-quota-exceeded', { 
            detail: { type: 'orders' } 
          }));
        }
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
    if (isQuotaError(error)) {
      console.warn('Firebase quota exceeded, disabling Firebase');
      setFirebaseDisabled(true);
      window.dispatchEvent(new CustomEvent('firebase-quota-exceeded', { 
        detail: { type: 'orders' } 
      }));
    }
    throw error;
  }
};

// Export function to manually re-enable Firebase (for testing or after quota resets)
export const reEnableFirebase = (): void => {
  setFirebaseDisabled(false);
  window.dispatchEvent(new CustomEvent('firebase-re-enabled'));
};

// Export function to check if Firebase is disabled
export const checkFirebaseStatus = (): { available: boolean; disabled: boolean } => {
  return {
    available: db !== null,
    disabled: isFirebaseDisabled()
  };
};



