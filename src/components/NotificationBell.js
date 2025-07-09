import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { FaBell, FaCheck, FaCheckDouble, FaTimes } from 'react-icons/fa';
import styled from 'styled-components';

// Styled components for better organization and theming
const NotificationContainer = styled.div`
  position: relative;
  margin: 0 8px;
`;

const BellButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: #ff4757;
  color: white;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  padding: 0 4px;
  
  @media (max-width: 768px) {
    min-width: 16px;
    height: 16px;
    font-size: 0.6rem;
  }
`;

const Dropdown = styled.div`
  position: fixed;
  top: 60px;
  right: 20px;
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: ${({ $isOpen }) => ($isOpen ? 'translateY(0)' : 'translateY(-10px)')};
  opacity: ${({ $isOpen }) => ($isOpen ? '1' : '0')};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  @media (min-width: 768px) {
    position: absolute;
    top: 50px;
    right: 0;
    width: 380px;
  }
  
  @media (max-width: 480px) {
    right: 10px;
    width: calc(100% - 20px);
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #333;
  font-weight: 600;
`;

const MarkAllButton = styled.button`
  background: none;
  border: none;
  font-size: 0.8rem;
  color: #4a6cf7;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(74, 108, 247, 0.1);
  }
`;

const NotificationList = styled.div`
  overflow-y: auto;
  flex: 1;
  max-height: 400px;
  -webkit-overflow-scrolling: touch;
`;

const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
`;

const NotificationItem = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  background-color: ${({ $unread }) => ($unread ? '#f8f9ff' : 'white')};
  cursor: ${({ $unread }) => ($unread ? 'pointer' : 'default')};
  transition: background-color 0.2s, transform 0.1s;
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  &:active {
    transform: scale(0.99);
  }
  
  &:hover {
    background-color: ${({ $unread }) => ($unread ? '#f0f4ff' : '#f9f9f9')};
  }
`;

const Message = styled.div`
  font-size: 0.9rem;
  color: #333;
  line-height: 1.4;
`;

const Time = styled.div`
  font-size: 0.75rem;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ReadIndicator = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #4a6cf7;
  margin-right: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const AcceptButton = styled(ActionButton)`
  background-color: #10B981;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #059669;
  }
`;

const DeclineButton = styled(ActionButton)`
  background-color: #EF4444;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #DC2626;
  }
`;

const NotificationBell = ({ userType, userId, supplierEmail }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  console.log('NotificationBell rendered with:', { userType, userId, supplierEmail });

  // Define fetchNotifications function outside useEffect so it can be called elsewhere
  const fetchNotifications = async () => {
    try {
      let query;
      
      if (userType === 'admin' && userId) {
        // For admin users - get notifications where they are the target
        query = supabase
          .from('notifications')
          .select(`
            *,
            events:event_id (name)
          `)
          .eq('admin_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
      } else if (userType === 'supplier' && supplierEmail) {
        // For suppliers - get notifications addressed to their email
        const normalizedEmail = supplierEmail.toLowerCase().trim();
        
        query = supabase
          .from('notifications')
          .select(`
            *
          `)
          .eq('supplier_email', normalizedEmail)
          .in('type', ['invitation', 'application_accepted', 'new_message', 'task_assignment', 'connection_request'])
          .order('created_at', { ascending: false })
          .limit(10);
      }

      if (query) {
        console.log(`Executing notification query for ${userType}:`, 
          userType === 'supplier' ? `supplier_email = ${supplierEmail.toLowerCase().trim()}` : `admin_user_id = ${userId}`);
        
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching notifications:', error);
          throw error;
        }
        
        console.log('Raw notification data for', userType, ':', data);
        
        // Process notifications without fetching missing event details
        // since events table is empty and causes 406 errors
        const fetchedNotifications = data || [];
        
        // Only count unread notifications that are visible (not filtered out)
        const visibleNotifications = fetchedNotifications.filter(n => !shouldHideNotification(n, userType));
        setNotifications(fetchedNotifications);
        const unread = visibleNotifications.filter(n => n.status === 'unread').length;
        setUnreadCount(unread);
        
        // DEBUG ONLY: If this is a supplier and they have no notifications, try direct DB access
        if (userType === 'supplier' && (!fetchedNotifications || fetchedNotifications.length === 0)) {
          console.log('No notifications found for supplier. Checking RLS permissions...');
          // Check if there are actually any notifications in the table for this email
          try {
            // Check currently logged-in user
            const { data: userData, error: userError } = await supabase.auth.getUser();
            console.log('Current authenticated user:', userData?.user?.email || 'No user found');
            console.log('User metadata:', userData?.user?.user_metadata);
            console.log('Comparing with supplierEmail prop:', supplierEmail);
            
            // Check auth email matches query email
            if (userData?.user?.email?.toLowerCase() !== supplierEmail?.toLowerCase().trim()) {
              console.error('AUTH MISMATCH: The authenticated user email does not match the supplied email in the component');
              console.log(`Auth email: ${userData?.user?.email?.toLowerCase() || 'none'}, Component email: ${supplierEmail?.toLowerCase().trim() || 'none'}`);
              console.log('This will cause RLS policy failure since auth.email() != supplier_email');

              // Test queries directly against the database
              try {
                // First try to query all notifications for this email to see if there are any
                const { data: allNotifs, error: notifErr } = await supabase
                  .from('notifications')
                  .select('*')
                  .eq('supplier_email', supplierEmail);

                console.log('Database has', allNotifs?.length || 0, 'notifications for email', supplierEmail);

                // For debugging, try querying all notifications without filtering
                console.log('Attempting to query ALL notifications to test permissions...');
                
                const { data: allNotifications, error: allNotifErr } = await supabase
                  .from('notifications')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .limit(30);
                
                if (allNotifErr) {
                  console.error('Error querying all notifications:', allNotifErr);
                } else {
                  console.log('Found', allNotifications?.length || 0, 'total notifications with unrestricted query');
                  
                  // Check if there are any notifications matching this specific email
                  const matchingNotifs = allNotifications?.filter(n => 
                    n.supplier_email?.toLowerCase() === supplierEmail?.toLowerCase())
                    .length || 0;
                    
                  console.log('Found', matchingNotifs, 'notifications matching this supplier email');

                  // If still nothing, try inserting a test notification
                  if (matchingNotifs === 0) {
                    console.log('Attempting to create a test notification');
                    
                    // Get current user
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    
                    // Create a test notification
                    if (authUser) {
                      const { data: testNotif, error: testErr } = await supabase
                        .from('notifications')
                        .insert({
                          supplier_email: supplierEmail,
                          type: 'test_notification',
                          status: 'unread',
                          content: 'This is a test notification',
                          user_id: authUser.id
                        })
                        .select();
                        
                      if (testErr) {
                        console.error('Error creating test notification:', testErr);
                      } else {
                        console.log('Test notification created successfully. Refresh to see it.');
                      }
                    }
                  }
                }
              } catch (e) {
                console.error('Error in diagnostic queries:', e);
              }
            }
          } catch (authErr) {
            console.error('Error checking auth status:', authErr);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  };
  
  // Fetch notifications when component mounts or dependencies change
  useEffect(() => {

    // Only setup if we have the required parameters
    if ((userType === 'admin' && userId) || (userType === 'supplier' && supplierEmail)) {
      fetchNotifications();
    }
  }, [userType, userId, supplierEmail]);
  
  // Create a separate effect for the subscription to better control its lifecycle
  useEffect(() => {
    let subscription = null;
    
    // Generate a unique channel name to avoid conflicts
    const channelName = `notification-changes-${userType}-${userId || supplierEmail}`;
    
    if ((userType === 'admin' && userId) || (userType === 'supplier' && supplierEmail)) {
      // Set up real-time subscription
      const filter = userType === 'admin' 
        ? `admin_user_id=eq.${userId}` 
        : `supplier_email=eq.${supplierEmail}`;
      
      try {
        subscription = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: filter
          }, async (payload) => {
            // Refresh notifications when we get an event
            try {
              let query;
              
              if (userType === 'admin' && userId) {
                query = supabase
                  .from('notifications')
                  .select(`
                    *,
                    events:event_id (name)
                  `)
                  .eq('admin_user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(10);
              } else if (userType === 'supplier' && supplierEmail) {
                const normalizedEmail = supplierEmail.toLowerCase().trim();
                
                query = supabase
                  .from('notifications')
                  .select(`
                    *
                  `)
                  .eq('supplier_email', normalizedEmail)
                  .in('type', ['invitation', 'application_accepted', 'new_message', 'task_assignment'])
                  .order('created_at', { ascending: false })
                  .limit(10);
              }

              if (query) {
                const { data, error } = await query;
                if (error) throw error;
                
                console.log('Raw notification data for', userType, ':', data);
                
                // Process notifications without fetching missing event details
                // since events table is empty and causes 406 errors
                const processedData = data || [];
                
                setNotifications(processedData);
                setUnreadCount((processedData || []).filter(n => n.status === 'unread').length);
              }
            } catch (err) {
              console.error('Error refreshing notifications:', err);
            }
          })
          .subscribe();
      } catch (err) {
        console.error('Error setting up notification subscription:', err);
      }
    }
        
    return () => {
      // Clean up subscription when component unmounts or dependencies change
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userType, userId, supplierEmail]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mark notifications as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, status: 'read' } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      let matchClause = {};
      if (userType === 'admin' && userId) {
        matchClause = { admin_user_id: userId };
      } else if (userType === 'supplier' && supplierEmail) {
        const normalizedEmail = supplierEmail.toLowerCase().trim();
        matchClause = { supplier_email: normalizedEmail };
      }
      
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .match(matchClause)
        .eq('status', 'unread');
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, status: 'read' })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Helper to determine if a notification should be hidden based on user role
  const shouldHideNotification = (notification, currentUserType) => {
    if (!notification) return false;

    // Hide message notifications that originate from the same role that is currently viewing
    if (notification.type === 'new_message' && notification.content) {
      const contentLower = notification.content.toLowerCase();
      if (currentUserType === 'admin' && contentLower.startsWith('new message from admin')) {
        // Admin should not see notifications they sent to suppliers
        return true;
      }
      if (currentUserType === 'supplier' && contentLower.startsWith('new message from supplier')) {
        // Supplier should not see notifications they sent to admin
        return true;
      }
    }
    return false;
  };

  const formatNotificationMessage = (notification) => {
    // Handle connection requests
    if (notification.type === 'connection_request') {
      if (userType === 'supplier') {
        try {
          // Properly parse the metadata field which contains admin_name
          let metadata = {};
          if (notification.metadata && typeof notification.metadata === 'string') {
            metadata = JSON.parse(notification.metadata);
          } else if (notification.metadata) {
            metadata = notification.metadata; // Already an object
          }
          
          // Use the admin_name from metadata if available, otherwise use the content field directly
          return metadata.admin_name 
            ? `${metadata.admin_name} wants to connect with you` 
            : (notification.content || 'Someone wants to connect with you');
        } catch (error) {
          console.error('Error parsing connection request:', error);
          return notification.content || 'Someone wants to connect with you';
        }
      }
      return null; // Don't show connection requests to admin
    }
    
    // If content exists, check if it's an admin message and skip it
    // Always override for task assignment notifications
    if (notification.type === 'task_assignment') {
      return userType === 'supplier'
        ? 'You have been assigned a new task for this event.'
        : 'You assigned a new task for this event.';
    }
    // Supplier invitation message
    if (userType === 'supplier' && notification.type === 'invitation') {
      let eventName = notification.events?.name;
      if (!eventName) {
        // Try to extract event name from existing content string: e.g., You have invited a supplier to "Fire"
        if (notification.content) {
          const match = notification.content.match(/"([^\"]+)"/);
          if (match && match[1]) eventName = match[1];
        }
      }
      if (!eventName && notification.event_id) {
        eventName = `Event ID: ${notification.event_id}`;
      }
      // If we still could not resolve the event name, it likely means this was a public event
      // broadcast where the name wasn't included. Show a generic public-event message.
      if (!eventName || eventName === 'this event' || eventName.startsWith('Event ID')) {
        return 'New public event added.';
      }
      return `You have been added to "${eventName || 'this event'}"`;
    }
    if (userType === 'admin' && notification.type === 'application_accepted') {
      return `Application accepted notification for event "${notification.events?.name || notification.event_id || 'Unknown event'}"`;
    }
    if (userType === 'supplier' && notification.type === 'application_accepted') {
      return `Your application to the event "${notification.events?.name || notification.event_id || 'Unknown event'}" has been accepted!`;
    }
    if (notification.content) {
      // Always display content, including admin messages, for suppliers
      return notification.content;
    }
    
    // No longer skipping message notifications from admin for suppliers
    
    // Fallback to generating a message based on type
    const eventName = notification.events?.name || 
                     (notification.event_id ? `Event ID: ${notification.event_id}` : 'Unknown event');
    
    if (userType === 'admin' && notification.type === 'invitation') {
      return `You invited a supplier to "${eventName}"`;
    } else if (userType === 'supplier' && notification.type === 'invitation') {
      // If the event name could not be resolved (e.g., "Unknown event") fall back to a generic message
      if (!eventName || eventName.startsWith('Unknown event') || eventName.startsWith('Event ID')) {
        return "You've been invited to the event";
      }
      return `You've been invited to the event "${eventName}"`;
    } else if (notification.message) {
      // Fallback to message field if content is not available
      return notification.message;
    }
    
    // Default fallback
    return `${notification.type || 'New'} notification for event "${eventName}"`;
  };

  // Handle connection request acceptance
  const handleAcceptConnection = async (notification) => {
    try {
      // Parse metadata which contains admin and supplier info
      let metadata = {};
      try {
        if (notification.metadata && typeof notification.metadata === 'string') {
          metadata = JSON.parse(notification.metadata);
        } else if (notification.metadata) {
          metadata = notification.metadata; // Already an object
        }
      } catch (parseError) {
        console.error('Error parsing metadata:', parseError);
        throw new Error('Invalid metadata format');
      }
      
      // Extract admin and supplier details
      const { admin_id, admin_name, supplier_id, supplier_name } = metadata;
      
      // Validate required data
      if (!admin_id || !supplier_id) {
        throw new Error('Missing admin_id or supplier_id in notification metadata');
      }
      
      // Get current user (supplier) info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: supplierProfile } = await supabase
        .from('profiles')
        .select('full_name, email, company_name')
        .eq('id', currentUser.id)
        .single();
      
      const supplierDisplayName = supplierProfile?.company_name || 
                               supplierProfile?.full_name || 
                               supplierProfile?.email || 
                               'Supplier';
      
      // Create a conversation entry for messaging
      const conversationId = `${admin_id}_${currentUser.id}`;
      
      // Mark notification as read and accepted
      await supabase
        .from('notifications')
        .update({ 
          status: 'read',
          content: `Connection accepted with ${admin_name}` 
        })
        .eq('id', notification.id);
      
      // Create initial message to establish the conversation
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: 'Connection accepted',
          event_id: null, // This is a direct conversation, not event-related
          supplier_email: currentUser.email
        });
      
      // Send notification to admin that supplier accepted the connection
      await supabase
        .from('notifications')
        .insert({
          type: 'connection_accepted',
          admin_user_id: admin_id,
          supplier_email: currentUser.email,
          content: `${supplierDisplayName} accepted your connection request`,
          metadata: JSON.stringify({
            admin_id: admin_id,
            supplier_id: currentUser.id,
            supplier_name: supplierDisplayName,
            supplier_email: currentUser.email
          }),
          status: 'unread'
        });
        
      // Add supplier to admin's team/connections list (in planners table)
      // First check if the supplier is already in the admin's team
      const { data: existingTeamMember } = await supabase
        .from('planners')
        .select('id')
        .eq('user_id', admin_id)
        .eq('email', currentUser.email)
        .single();
      
      // Only add if not already a team member
      if (!existingTeamMember) {
        await supabase
          .from('planners')
          .insert({
            user_id: admin_id,
            admin_email: admin_name.includes('@') ? admin_name : null, // Use admin_name as email if it looks like an email
            name: supplierDisplayName,
            email: currentUser.email,
            connection_type: 'supplier' // Add this field to distinguish suppliers from other team members
          });
      }
      
      // Refresh notifications
      await fetchNotifications();
      
      alert('Connection accepted! You can now message each other.');
    } catch (error) {
      console.error('Error accepting connection:', error);
      alert('Failed to accept connection. Please try again.');
    }
  };
  
  // Handle connection request decline
  const handleDeclineConnection = async (notification) => {
    try {
      // Parse metadata which contains admin and supplier info
      let metadata = {};
      try {
        if (notification.metadata && typeof notification.metadata === 'string') {
          metadata = JSON.parse(notification.metadata);
        } else if (notification.metadata) {
          metadata = notification.metadata; // Already an object
        }
      } catch (parseError) {
        console.error('Error parsing metadata:', parseError);
        throw new Error('Invalid metadata format');
      }
      
      // Extract admin details
      const { admin_id, admin_name } = metadata;
      
      // Validate required data
      if (!admin_id) {
        throw new Error('Missing admin_id in notification metadata');
      }
      
      // Get current user (supplier) info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: supplierProfile } = await supabase
        .from('profiles')
        .select('full_name, email, company_name')
        .eq('id', currentUser.id)
        .single();
      
      const supplierDisplayName = supplierProfile?.company_name || 
                              supplierProfile?.full_name || 
                              supplierProfile?.email || 
                              'Supplier';
      
      // Mark notification as read and declined
      await supabase
        .from('notifications')
        .update({ 
          status: 'read',
          content: 'Connection request declined' 
        })
        .eq('id', notification.id);
      
      // Send notification to admin that supplier declined the connection
      await supabase
        .from('notifications')
        .insert({
          type: 'connection_declined',
          admin_user_id: admin_id,
          supplier_email: currentUser.email,
          content: `${supplierDisplayName} declined your connection request`,
          metadata: JSON.stringify({
            admin_id: admin_id,
            supplier_id: currentUser.id,
            supplier_name: supplierDisplayName,
            supplier_email: currentUser.email
          }),
          status: 'unread'
        });
      
      // Refresh notifications
      await fetchNotifications();
      
      alert('Connection request declined.');
    } catch (error) {
      console.error('Error declining connection:', error);
      alert('Failed to decline connection. Please try again.');
    }
  };

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <NotificationContainer>
      <BellButton 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <FaBell />
        {unreadCount > 0 && (
          <Badge>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </BellButton>

      <Dropdown 
        ref={dropdownRef}
        $isOpen={isOpen}
        aria-hidden={!isOpen}
      >
        <Header>
          <Title>Notifications</Title>
          {unreadCount > 0 ? (
            <MarkAllButton onClick={markAllAsRead}>
              <FaCheckDouble size={12} />
              <span>Mark all as read</span>
            </MarkAllButton>
          ) : (
            <MarkAllButton onClick={() => setIsOpen(false)}>
              <FaTimes size={14} />
            </MarkAllButton>
          )}
        </Header>

        <NotificationList>
          {notifications.length === 0 ? (
            <EmptyState>No notifications yet</EmptyState>
          ) : (
            notifications
              .filter(notification => !shouldHideNotification(notification, userType))
              .map(notification => {
                const message = formatNotificationMessage(notification);
                if (message === null) return null;
                
                const isUnread = notification.status === 'unread';
                
                return (
                  <NotificationItem
                    key={notification.id}
                    $unread={isUnread}
                    onClick={() => isUnread && notification.type !== 'connection_request' && markAsRead(notification.id)}
                  >
                    <Message>
                      {isUnread && <ReadIndicator aria-hidden="true" />}
                      {message}
                    </Message>
                    <Time>
                      {isUnread && <FaCheck size={10} />}
                      {formatRelativeTime(notification.created_at)}
                    </Time>
                    {notification.type === 'connection_request' && userType === 'supplier' && notification.status !== 'read' && (
                      <ActionButtons>
                        <AcceptButton onClick={(e) => { e.stopPropagation(); handleAcceptConnection(notification); }}>
                          Accept
                        </AcceptButton>
                        <DeclineButton onClick={(e) => { e.stopPropagation(); handleDeclineConnection(notification); }}>
                          Decline
                        </DeclineButton>
                      </ActionButtons>
                    )}
                  </NotificationItem>
                );
              })
              .filter(Boolean)
          )}
        </NotificationList>
      </Dropdown>
    </NotificationContainer>
  );
};

export default NotificationBell;
