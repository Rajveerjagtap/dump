import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type UserType = 'student' | 'teacher' | null;

interface UserTypeState {
  userType: UserType;
  loading: boolean;
}

type UserTypeAction =
  | { type: 'SELECT_USER_TYPE'; payload: UserType }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_SELECTION' };

const initialState: UserTypeState = {
  userType: null,
  loading: false,
};

function userTypeReducer(state: UserTypeState, action: UserTypeAction): UserTypeState {
  switch (action.type) {
    case 'SELECT_USER_TYPE':
      return {
        ...state,
        userType: action.payload,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'CLEAR_SELECTION':
      return {
        ...state,
        userType: null,
        loading: false,
      };
    default:
      return state;
  }
}

interface UserTypeContextType {
  state: UserTypeState;
  selectUserType: (userType: UserType) => Promise<void>;
  clearSelection: () => void;
}

const UserTypeContext = createContext<UserTypeContextType | undefined>(undefined);

export function UserTypeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userTypeReducer, initialState);

  const selectUserType = async (userType: UserType) => {
    if (!userType) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch('http://localhost:8001/select-user-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_type: userType }),
      });

      if (response.ok) {
        dispatch({ type: 'SELECT_USER_TYPE', payload: userType });
        // Store selection in localStorage for persistence
        localStorage.setItem('userType', userType);
      } else {
        console.warn('Failed to select user type, but continuing anyway');
        dispatch({ type: 'SELECT_USER_TYPE', payload: userType });
        localStorage.setItem('userType', userType);
      }
    } catch (error) {
      console.error('Error selecting user type, but continuing anyway:', error);
      // Don't let API errors prevent the app from working
      dispatch({ type: 'SELECT_USER_TYPE', payload: userType });
      localStorage.setItem('userType', userType);
    }
  };

  const clearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
    localStorage.removeItem('userType');
  };

  // Check for stored user type on mount
  React.useEffect(() => {
    const storedUserType = localStorage.getItem('userType') as UserType;
    if (storedUserType) {
      dispatch({ type: 'SELECT_USER_TYPE', payload: storedUserType });
    }
  }, []);

  return (
    <UserTypeContext.Provider value={{ state, selectUserType, clearSelection }}>
      {children}
    </UserTypeContext.Provider>
  );
}

export function useUserType() {
  const context = useContext(UserTypeContext);
  if (context === undefined) {
    throw new Error('useUserType must be used within a UserTypeProvider');
  }
  return context;
}

// Keep these for backward compatibility with existing components
export function useAuth() {
  return useUserType();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <UserTypeProvider>{children}</UserTypeProvider>;
}