import { useState } from "react";
import { ApiError } from "../api/types.ts";
import type { CreateInviteResponse, Member, UserRole, WorkspaceInvite } from "../api/types.ts";
import { useCreateInvite, useInvites, useRevokeInvite } from "../hooks/use-invites.ts";
import { useMembers } from "../hooks/use-members.ts";
import { Button, Card, EmptyState, ErrorBanner, SecondaryButton, Spinner } from "./ui.tsx";

const roleText: Record<UserRole, string> = {
  ADMIN: "管理员",
  MEMBER: "成员",
};

export function MembersPanel({ isAdmin }: { isAdmin: boolean }) {
  const membersQuery = useMembers();
  const invitesQuery = useInvites(isAdmin);
  const createInvite = useCreateInvite();
  const [newInvite, setNewInvite] = useState<CreateInviteResponse | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const handleCreateInvite = () => {
    setCopyMessage(null);
    createInvite.mutate(undefined, {
      onSuccess: (invite) => {
        setNewInvite(invite);
      },
    });
  };

  const handleCopy = async () => {
    if (!newInvite) {
      return;
    }

    try {
      // 优先使用现代 clipboard API（HTTPS 环境）
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(newInvite.inviteLink);
        setCopyMessage("邀请链接已复制");
        return;
      }

      // 降级方案：使用传统 execCommand（HTTP 环境）
      const textArea = document.createElement("textarea");
      textArea.value = newInvite.inviteLink;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopyMessage("邀请链接已复制");
      } else {
        setCopyMessage("复制失败，请手动复制下方链接");
      }
    } catch {
      setCopyMessage("复制失败，请手动复制下方链接");
    }
  };

  return (
    <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-4 md:mt-6">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">成员</h2>
            <p className="mt-1 text-sm text-slate-500">查看当前 workspace 的成员</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {isAdmin ? "管理员视图" : "成员视图"}
          </span>
        </div>

        {membersQuery.isLoading && <Spinner />}
        {membersQuery.isError && (
          <div className="mt-4">
            <ErrorBanner message="加载成员失败" onRetry={() => void membersQuery.refetch()} />
          </div>
        )}
        {membersQuery.data && membersQuery.data.length === 0 && (
          <div className="mt-4">
            <EmptyState icon="👥" title="还没有成员" description="成员加入后会显示在这里" />
          </div>
        )}
        {membersQuery.data && membersQuery.data.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {membersQuery.data.map((member) => (
              <MemberRow key={member.id} member={member} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">邀请</h2>
              <p className="mt-1 text-sm text-slate-500">创建一次性链接，邀请新成员加入</p>
            </div>
            <Button onClick={handleCreateInvite} disabled={createInvite.isPending}>
              {createInvite.isPending ? "创建中…" : "创建邀请"}
            </Button>
          </div>

          {createInvite.isError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
              {getCreateInviteError(createInvite.error)}
            </p>
          )}

          {newInvite && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-sm font-semibold text-slate-800">新邀请链接只显示这一次</p>
              <p className="mt-1 break-all rounded-xl bg-white/80 p-2 text-xs text-slate-600">
                {newInvite.inviteLink}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SecondaryButton onClick={() => void handleCopy()}>复制链接</SecondaryButton>
                <span className="text-xs text-slate-500">有效期至 {formatDate(newInvite.expiresAt)}</span>
              </div>
              {copyMessage && <p className="mt-2 text-xs text-slate-600">{copyMessage}</p>}
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-800">待处理邀请</h3>
            {invitesQuery.isLoading && <Spinner />}
            {invitesQuery.isError && (
              <div className="mt-3">
                <ErrorBanner message="加载邀请失败" onRetry={() => void invitesQuery.refetch()} />
              </div>
            )}
            {invitesQuery.data && invitesQuery.data.length === 0 && (
              <EmptyState title="暂无待处理邀请" description="创建邀请后，这里会显示可撤销的未使用邀请" />
            )}
            {invitesQuery.data && invitesQuery.data.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {invitesQuery.data.map((invite) => (
                  <InviteRow key={invite.id} invite={invite} />
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function MemberRow({ member, isAdmin }: { member: Member; isAdmin: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{member.name}</p>
          {isAdmin && member.email && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{member.email}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
          {roleText[member.role]}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">加入时间：{formatDate(member.createdAt)}</p>
    </article>
  );
}

function InviteRow({ invite }: { invite: WorkspaceInvite }) {
  const revokeInvite = useRevokeInvite();
  const [confirming, setConfirming] = useState(false);

  const handleRevoke = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    revokeInvite.mutate(invite.id, {
      onSuccess: () => setConfirming(false),
    });
  };

  return (
    <article className="rounded-2xl border border-amber-200 bg-white/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">创建于 {formatDate(invite.createdAt)}</p>
          <p className="mt-1 text-xs text-slate-500">有效期至 {formatDate(invite.expiresAt)}</p>
        </div>
        <SecondaryButton className="px-3 py-2 text-xs" onClick={handleRevoke} disabled={revokeInvite.isPending}>
          {revokeInvite.isPending ? "撤销中…" : confirming ? "确认撤销" : "撤销"}
        </SecondaryButton>
      </div>
      {revokeInvite.isError && <p className="mt-2 text-xs text-red-600">撤销失败，请重试</p>}
    </article>
  );
}

function getCreateInviteError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "待处理邀请已达到上限，或当前无法创建邀请";
  }

  return "创建邀请失败，请重试";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
