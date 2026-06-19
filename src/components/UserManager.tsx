import React, { useState, useEffect } from "react";
import { UserPlus, Trash2, Key, Users, Shield, AlertCircle, RefreshCw, Loader2, Check } from "lucide-react";
import { User } from "../types";

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New User Form State
  const [newId, setNewId] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "editor">("editor");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "회원 목록을 불러오지 못했습니다.");
      }
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newId.trim() || !newPin.trim()) {
      setError("사용할 아이디와 PIN 번호를 기입해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId.trim(), pin: newPin.trim(), role: newRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "계정 발급에 실패했습니다.");
      }

      setSuccess(`계정 '${newId}'이(가) 성공적으로 신규 발급되었습니다.`);
      setNewId("");
      setNewPin("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(`정말로 '${userId}' 계정을 완전히 삭제하시겠습니까?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "계정 삭제에 실패했습니다.");
      }

      setSuccess(`계정 '${userId}' 삭제가 정상 처리되었습니다.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6" id="user-manager-panel">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
        <div className="p-2.5 bg-slate-100 rounded-xl text-slate-800">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 font-sans">출제자 및 부관리자 ID 발급 및 권한 제어</h3>
          <p className="text-xs text-slate-500">다른 선생님이나 협력자에게 아이디와 로그인 핀번호를 발급하여, 관리 범위를 한정할 수 있는 계정 관리 패널입니다.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-xl mb-4 flex items-center gap-2 font-sans">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl mb-4 flex items-center gap-2 font-sans">
          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Issuance Form */}
        <div className="lg:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            신규 계정 발급하기
          </h4>

          <form onSubmit={handleCreateUser} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">사용자 로그인 ID</label>
              <input
                type="text"
                placeholder="예: teacher1, partner_a"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-sans"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">비밀번호 / PIN 번호</label>
              <input
                type="text"
                placeholder="간편 PIN 4자리 이상"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">접근 권한 역할</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "editor")}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-sans"
              >
                <option value="editor">단독 질문 작성 및 제한 관람 (Editor)</option>
                <option value="admin">마스터 관리자 권한 (Full Control)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 rounded-lg cursor-pointer transition-colors"
            >
              계정 발급 및 저장
            </button>
          </form>
        </div>

        {/* User accounts list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Shield className="w-4 h-4 text-emerald-600" />
              발급된 계정 및 자격제어 리스트 ({users.length}명)
            </h4>
            <button 
              onClick={fetchUsers} 
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-50/55 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${u.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 font-sans">{u.id}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        u.role === "admin" 
                          ? "bg-indigo-600 text-white" 
                          : "bg-slate-200 text-slate-700"
                      }`}>
                        {u.role === "admin" ? "마스터" : "편집/결과관람"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">PIN: {u.pin}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {u.id === "admin" ? (
                    <span className="text-[10px] text-slate-400 font-medium select-none bg-slate-50 px-2.5 py-1 rounded-md">삭제 영구불가 (마스터)</span>
                  ) : (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 font-sans text-xs cursor-pointer flex items-center gap-1 font-medium transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
