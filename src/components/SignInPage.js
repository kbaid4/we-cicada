import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from './SignInPage.module.css';
import { supabase } from '../supabaseClient';
import { linkSupplierInvites } from '../utils/inviteLinking';
import { updateEventSuppliersWithUserId } from '../utils/updateSupplierEvents';

const SignInPage = () => {
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!credentials.email || !credentials.password) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    console.log('Attempting sign in with email:', credentials.email);
    
    // Supabase Auth sign in
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (signInError) {
      console.error('Sign in error details:', {
        message: signInError.message,
        status: signInError.status,
        details: signInError
      });
      setError(`Sign in failed: ${signInError.message}`);
      return;
    }
    
    console.log('Sign in successful, user data:', data?.user?.id);

    // Get the latest user info from Supabase Auth (ensures user_metadata is present)
    const { data: userData, error: userFetchError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userFetchError) {
      setError('Failed to fetch user data: ' + userFetchError.message);
      return;
    }
    if (user) {
      // Get metadata robustly: prefer user.user_metadata, fallback to user.raw_user_meta_data
      const meta = user.user_metadata && Object.keys(user.user_metadata).length > 0
        ? user.user_metadata
        : user.raw_user_meta_data || {};
      // DEBUG: Log both user.user_metadata and user.raw_user_meta_data
      console.log('user.user_metadata at sign in:', user.user_metadata);
      console.log('user.raw_user_meta_data at sign in:', user.raw_user_meta_data);
      // Ensure userType is exactly 'admin' or 'supplier' to match the DB constraint
      let userType = meta.user_type || meta.type || '';
      // Normalize to lowercase and ensure it's strictly 'admin' or 'supplier'
      userType = userType.toLowerCase() === 'admin' ? 'admin' : 'supplier';
      // Check if profile exists - using a simpler approach to avoid RLS policy issues
      try {
        // First try a direct insert - this is the simplest approach that may work without triggering RLS issues
        const profileData = {
          id: user.id,
          email: credentials.email,
          full_name: user.user_metadata.full_name || '',
          user_type: userType,
          service_type: user.user_metadata.service_type || '', // Include service_type from metadata
          company_name: user.user_metadata.companyname || '', // Include company_name as well
          address: user.user_metadata.address || '',
          phone: user.user_metadata.phone || '',
          created_at: new Date(),
          updated_at: new Date()
        };
        
        // Attempt direct insert - if profile exists, this will fail but we'll catch it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileData]);
        
        if (insertError) {
          console.log('Profile insert error (may be expected if profile exists):', insertError.message);
          console.log('Assuming profile exists already, continuing...');
        } else {
          console.log('Profile created successfully');
        }
        
        // We continue regardless of insert success - if it fails, it likely means the profile exists already
      } catch (profileError) {
        console.error('Profile operation error:', profileError);
        // Continue despite error - the profile might already exist
      }
      // Redirect based on user_type
      if (user.user_metadata.user_type === "admin") {
        navigate("/SuppliersPage");
      } else if (user.user_metadata.user_type === "supplier") {
        // First, ensure event_suppliers table has this user's ID for all entries matching their email
        try {
          const result = await updateEventSuppliersWithUserId(user.id, credentials.email);
          console.log('Updated event_suppliers table with user ID:', result);
        } catch (err) {
          console.error('Error updating event_suppliers table:', err);
          // Continue with login process despite this error
        }

        // Then link any pending invites for this supplier
        // (event existence is now checked in the 'events' table, not event_audit_logs)
        await linkSupplierInvites({
          supplierId: user.id,
          supplierEmail: credentials.email
        });
        navigate("/SupplierHomepage");
      } else {
        setError('Unknown user type, cannot redirect.');
      }
    } else {
      setError('No user returned from sign in.');
    }
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  // Track window width for responsive background image
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bgStyle = windowWidth > 600 ? {
    backgroundImage: `url(${process.env.PUBLIC_URL}/images/landingpage/loginbg.png)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  } : undefined;

  return (
    <div className={styles['main-container']} style={bgStyle}>
      <div className={styles['signin-container']}>
        <div className={styles['logo-container']}>
          <img 
            src={`${process.env.PUBLIC_URL}/images/landingpage/logo.png`} 
            alt="CITADA Logo" 
            className={styles['site-logo']}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles['signin-form']}>
          <div className={styles['form-group']}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={credentials.email}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className={styles['error-message']}>{error}</div>}

          <button type="submit" className={styles['signin-button']}>Sign In</button>
        </form>

        <a href="#" className={styles['forgot-password']}>Forgot Password?</a>
      </div>
    </div>
  );
};

export default SignInPage;