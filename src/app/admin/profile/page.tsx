"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import Avatar from "@/components/admin/Avatar";
import { useConfirm } from "@/components/ConfirmDialog";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_path: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const supabase = createClient();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profile");
      if (res.ok) {
        const data: Profile = await res.json();
        setProfile(data);
        setFullName(data.full_name);
        setEmail(data.email);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updates: { email?: string; data?: { full_name: string } } = {};
      if (fullName !== profile.full_name) {
        updates.data = { full_name: fullName };
      }
      if (email !== profile.email) {
        updates.email = email;
      }
      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        return;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (updates.email) {
        toast.success("Check your inbox to confirm the email change");
      } else {
        toast.success("Profile updated");
      }
      await loadProfile();
      window.dispatchEvent(new Event("profile-updated"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (verifyError) {
        toast.error("Current password is incorrect");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const presignRes = await fetch("/api/admin/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: file.type,
          file_size: file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        toast.error(err.error || "Upload failed");
        return;
      }

      const { url, storage_path } = await presignRes.json();

      const putRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        toast.error("Upload to storage failed");
        return;
      }

      const oldPath = profile?.avatar_path;

      const { error } = await supabase.auth.updateUser({
        data: { avatar_path: storage_path },
      });
      if (error) {
        toast.error(error.message);
        return;
      }

      if (oldPath && oldPath !== storage_path) {
        fetch("/api/admin/profile/avatar/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: oldPath }),
        }).catch(() => {});
      }

      toast.success("Avatar updated");
      await loadProfile();
      window.dispatchEvent(new Event("profile-updated"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar_path) return;
    const ok = await confirm({
      title: "Remove avatar?",
      description: "Your avatar will be deleted from storage.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setUploadingAvatar(true);
    try {
      await fetch("/api/admin/profile/avatar", { method: "DELETE" });
      const { error } = await supabase.auth.updateUser({
        data: { avatar_path: null },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Avatar removed");
      await loadProfile();
      window.dispatchEvent(new Event("profile-updated"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-32 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-96 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account details
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="card-pad">
          <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
            Avatar
          </h2>
          <div className="flex items-center gap-5">
            <Avatar
              url={profile?.avatar_url}
              name={profile?.full_name}
              email={profile?.email}
              size={72}
            />
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary btn-sm"
                  disabled={uploadingAvatar}
                >
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {uploadingAvatar ? "Uploading…" : "Upload"}
                </button>
                {profile?.avatar_path && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="btn-ghost btn-sm text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-500/10 dark:hover:text-danger-300"
                    disabled={uploadingAvatar}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Remove
                  </button>
                )}
              </div>
              <p className="hint">PNG, JPG, WebP or GIF · up to 5 MB</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="card-pad">
          <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
            Account
          </h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="full_name" className="label">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Jane Doe"
                disabled={savingProfile}
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@gaviso.agency"
                disabled={savingProfile}
              />
              <p className="hint mt-1.5">
                Changing your email requires confirmation
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary"
            >
              {savingProfile ? "Saving…" : "Save account"}
            </button>
          </div>
        </form>

        <form onSubmit={handlePasswordSave} className="card-pad">
          <h2 className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50 mb-5">
            Password
          </h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="current_password" className="label">
                Current password
              </label>
              <input
                id="current_password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                autoComplete="current-password"
                disabled={savingPassword}
              />
            </div>
            <div>
              <label htmlFor="new_password" className="label">
                New password
              </label>
              <input
                id="new_password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                autoComplete="new-password"
                disabled={savingPassword}
              />
              <p className="hint mt-1.5">At least 8 characters</p>
            </div>
            <div>
              <label htmlFor="confirm_password" className="label">
                Confirm new password
              </label>
              <input
                id="confirm_password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                autoComplete="new-password"
                disabled={savingPassword}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="btn-primary"
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
