import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return Response.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return Response.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Attempt to change password using Base44 auth service
    try {
      // Use the service role to update password after verifying current credentials
      // This is a secure server-side operation
      await base44.asServiceRole.auth.changePassword({
        userId: user.id,
        currentPassword,
        newPassword
      });

      return Response.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (authError) {
      // If password change fails, it's likely due to incorrect current password
      return Response.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Password change error:', error);
    return Response.json(
      { error: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
});