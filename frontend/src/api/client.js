const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem("cinematch_token");
  }

  setToken(token) {
    if (token) {
      localStorage.setItem("cinematch_token", token);
    } else {
      localStorage.removeItem("cinematch_token");
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...(options.isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        // Clear invalid token
        this.setToken(null);
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        const error = new Error(errorData.detail || "Request failed");
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error(`API Error on ${options.method || "GET"} ${endpoint}:`, err);
      throw err;
    }
  }

  // --- Auth ---
  auth = {
    login: (email, password) =>
      this.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name, email, password) =>
      this.request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    logout: () => this.request("/auth/logout", { method: "POST" }),
    getMe: () => this.request("/auth/me"),
    updateProfile: (data) =>
      this.request("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  };

  // --- Movies ---
  movies = {
    getAll: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "" && val !== "All") {
          query.append(key, val);
        }
      });
      return this.request(`/movies?${query.toString()}`);
    },
    getById: (id) => this.request(`/movies/${id}`),
    create: (movieData) =>
      this.request("/movies", {
        method: "POST",
        body: JSON.stringify(movieData),
      }),
    update: (id, movieData) =>
      this.request(`/movies/${id}`, {
        method: "PUT",
        body: JSON.stringify(movieData),
      }),
    delete: (id) =>
      this.request(`/movies/${id}`, {
        method: "DELETE",
      }),
    uploadPoster: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return this.request("/movies/upload-poster", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
    },
  };

  // --- Search ---
  search = {
    query: (params = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "" && val !== "All") {
          query.append(key, val);
        }
      });
      return this.request(`/search?${query.toString()}`);
    },
    getSuggestions: (text) =>
      this.request(`/search/suggestions?q=${encodeURIComponent(text)}`),
  };

  // --- Recommendations ---
  recommendations = {
    getForYou: (limit = 15, excludeWatched = true) =>
      this.request(`/recommendations/for-you?limit=${limit}&exclude_watched=${excludeWatched}`),
    getSimilar: (movieId, limit = 8) =>
      this.request(`/recommendations/similar/${movieId}?limit=${limit}`),
    submitFeedback: (movieId, feedbackType) =>
      this.request("/recommendations/feedback", {
        method: "POST",
        body: JSON.stringify({ movie_id: movieId, feedback_type: feedbackType }),
      }),
    getGenres: () => this.request("/recommendations/genres"),
    getMoods: () => this.request("/recommendations/moods"),
  };

  // --- Ratings ---
  ratings = {
    getMyRatings: () => this.request("/ratings/me"),
    rateMovie: (movieId, ratingValue, optionalReview = null) =>
      this.request("/ratings", {
        method: "POST",
        body: JSON.stringify({
          movie_id: movieId,
          rating_value: ratingValue,
          optional_review: optionalReview,
        }),
      }),
    deleteRating: (ratingId) =>
      this.request(`/ratings/${ratingId}`, { method: "DELETE" }),
  };

  // --- Watchlist ---
  watchlist = {
    getAll: () => this.request("/watchlist"),
    add: (movieId) =>
      this.request(`/watchlist/${movieId}`, { method: "POST" }),
    remove: (movieId) =>
      this.request(`/watchlist/${movieId}`, { method: "DELETE" }),
  };

  // --- History ---
  history = {
    getAll: () => this.request("/history"),
    record: (movieId) =>
      this.request(`/history/${movieId}`, { method: "POST" }),
  };

  // --- Preferences ---
  preferences = {
    get: () => this.request("/preferences"),
    update: (prefData) =>
      this.request("/preferences", {
        method: "PUT",
        body: JSON.stringify(prefData),
      }),
  };

  // --- Admin ---
  admin = {
    getDashboard: () => this.request("/admin/dashboard"),
    getMetrics: () => this.request("/admin/analytics/metrics"),
    getUsers: (q = "") => this.request(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    toggleUserStatus: (userId, isActive) =>
      this.request(`/admin/users/${userId}/status?is_active=${isActive}`, {
        method: "PATCH",
      }),
    importCsv: (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return this.request("/admin/movies/import", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
    },
    getActivity: (limit = 50) =>
      this.request(`/admin/activity?limit=${limit}`),
  };
}

export const api = new ApiClient();
