type QueryFilter = {
  column: string;
  operator: "eq" | "in";
  value: unknown;
};

type QueryOrder = {
  column: string;
  ascending?: boolean;
};

const getBackendUrl = () => {
  const runtimeEnv = (window as any)._env_;
  return (
    runtimeEnv?.REACT_APP_BACKEND_URL ||
    (import.meta as any).env?.VITE_BACKEND_URL ||
    (import.meta as any).env?.REACT_APP_BACKEND_URL ||
    "http://localhost:8080"
  );
};

const getToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return token.startsWith('"') ? JSON.parse(token) : token;
  } catch {
    return token;
  }
};

const request = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      data: null,
      error: new Error(body?.error || "Erro ao consultar o Gestor Financeiro IA"),
    };
  }

  return body;
};

export const gestorFinancasApiRequest = request;

class QueryBuilder {
  private action: "select" | "insert" | "update" | "delete" = "select";
  private filters: QueryFilter[] = [];
  private orderBy?: QueryOrder;
  private payload?: unknown;
  private selectClause = "*";
  private wantsSingle = false;
  private wantsMaybeSingle = false;

  constructor(private resource: string) {}

  select(selectClause = "*") {
    this.selectClause = selectClause;
    return this;
  }

  insert(payload: unknown) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: unknown) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: "in", value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orderBy = { column, ascending: options.ascending };
    return this;
  }

  single() {
    this.wantsSingle = true;
    return this;
  }

  maybeSingle() {
    this.wantsMaybeSingle = true;
    return this;
  }

  private execute() {
    return request(`/gestor-financas-ia/${this.resource}/query`, {
      method: "POST",
      body: JSON.stringify({
        action: this.action,
        filters: this.filters,
        order: this.orderBy,
        payload: this.payload,
        select: this.selectClause,
        single: this.wantsSingle,
        maybeSingle: this.wantsMaybeSingle,
      }),
    });
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

const getCurrentUser = async () => {
  const { data, error } = await request("/gestor-financas-ia/me", { method: "GET" });

  if (error) {
    return { data: { user: null }, error };
  }

  return {
    data: {
      user: data?.user || null,
    },
    error: null,
  };
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const supabase = {
  from: (resource: string) => new QueryBuilder(resource),
  auth: {
    getUser: getCurrentUser,
    getSession: async () => ({ data: { session: getToken() ? { user: (await getCurrentUser()).data.user } : null }, error: null }),
    onAuthStateChange: (_callback: unknown) => ({
      data: { subscription: { unsubscribe: () => undefined } },
    }),
    signUp: async () => ({ error: null }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
  },
  storage: {
    from: () => ({
      upload: async (path: string, file: File) => {
        const dataUrl = await readAsDataUrl(file);
        localStorage.setItem(`gf-avatar:${path}`, dataUrl);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: localStorage.getItem(`gf-avatar:${path}`) || "" },
      }),
    }),
  },
  rpc: async () => ({ data: null, error: null }),
};
