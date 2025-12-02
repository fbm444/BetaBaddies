import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { api } from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SupportGroups() {
  const [view, setView] = useState<"browse" | "my-groups" | "group-detail">(
    "browse"
  );
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "feed" | "resources" | "challenges" | "referrals" | "members"
  >("feed");
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    category: "general",
    industry: "",
    roleType: "",
    isPublic: true,
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isGeneratingResources, setIsGeneratingResources] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    industry: "",
    roleType: "",
    search: "",
  });
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    postType: "discussion",
    isAnonymous: false,
  });
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newComment, setNewComment] = useState("");

  // Debug: Log when selectedMember changes
  useEffect(() => {
    console.log("selectedMember changed:", selectedMember);
  }, [selectedMember]);
  const [isPosting, setIsPosting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchGroups();
    fetchMyGroups();
  }, []);

  useEffect(() => {
    if (
      filters.category ||
      filters.industry ||
      filters.roleType ||
      filters.search
    ) {
      fetchGroups();
    }
  }, [filters]);

  useEffect(() => {
    if (selectedGroup && view === "group-detail") {
      fetchGroupDetails();
    }
  }, [selectedGroup, view, activeTab]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const response = await api.getSupportGroups(filters);
      if (response.ok && response.data) {
        setGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch support groups:", error);
      showNotification("error", "Failed to load support groups");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const response = await api.getUserSupportGroups();
      if (response.ok && response.data) {
        setMyGroups(response.data.groups || []);
      }
    } catch (error) {
      console.error("Failed to fetch my groups:", error);
    }
  };

  const fetchGroupDetails = async () => {
    if (!selectedGroup) return;
    setIsLoadingGroup(true);
    try {
      if (activeTab === "feed") {
        const response = await api.getGroupPosts(selectedGroup.id);
        if (response.ok && response.data) {
          setPosts(response.data.posts || []);
        }
      } else if (activeTab === "resources") {
        const response = await api.getGroupResources(selectedGroup.id);
        if (response.ok && response.data) {
          setResources(response.data.resources || []);
        }
      } else if (activeTab === "challenges") {
        const response = await api.getGroupChallenges(selectedGroup.id);
        if (response.ok && response.data) {
          setChallenges(response.data.challenges || []);
        }
      } else if (activeTab === "referrals") {
        const response = await api.getGroupReferrals(selectedGroup.id);
        if (response.ok && response.data) {
          setReferrals(response.data.referrals || []);
        }
      } else if (activeTab === "members") {
        const response = await api.getGroupMembers(selectedGroup.id);
        if (response.ok && response.data) {
          setMembers(response.data.members || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch group details:", error);
      showNotification("error", "Failed to load group content");
    } finally {
      setIsLoadingGroup(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const response = await api.joinSupportGroup(groupId);
      if (response.ok) {
        showNotification("success", "Successfully joined the group!");
        // Refresh groups list
        await fetchGroups();
        await fetchMyGroups();
        // If viewing this group, refresh the group details
        if (selectedGroup && selectedGroup.id === groupId) {
          const groupResponse = await api.getSupportGroup(groupId);
          if (groupResponse.ok && groupResponse.data) {
            setSelectedGroup(groupResponse.data.group);
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to join group:", error);
      showNotification("error", error.message || "Failed to join group");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const response = await api.leaveSupportGroup(groupId);
      if (response.ok) {
        showNotification("success", "Left the group");
        // Refresh groups list
        await fetchGroups();
        await fetchMyGroups();
        // If viewing this group, refresh the group details or go back to browse
        if (selectedGroup?.id === groupId) {
          const groupResponse = await api.getSupportGroup(groupId);
          if (groupResponse.ok && groupResponse.data) {
            setSelectedGroup(groupResponse.data.group);
          }
        }
      }
    } catch (error) {
      console.error("Failed to leave group:", error);
      showNotification("error", "Failed to leave group");
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      showNotification("error", "Group name is required");
      return;
    }
    if (!newGroup.category) {
      showNotification("error", "Category is required");
      return;
    }
    setIsCreatingGroup(true);
    try {
      const response = await api.createSupportGroup({
        name: newGroup.name.trim(),
        description: newGroup.description.trim() || undefined,
        category: newGroup.category,
        industry: newGroup.industry.trim() || undefined,
        roleType: newGroup.roleType.trim() || undefined,
        isPublic: newGroup.isPublic,
      });
      if (response.ok && response.data) {
        showNotification("success", "Support group created successfully!");
        setShowCreateGroupModal(false);
        // Reset form
        setNewGroup({
          name: "",
          description: "",
          category: "general",
          industry: "",
          roleType: "",
          isPublic: true,
        });
        // Refresh groups list
        await fetchGroups();
        await fetchMyGroups();
        // If a group was created, navigate to it
        if (response.data.group) {
          setSelectedGroup(response.data.group);
          setView("group-detail");
        }
      }
    } catch (error: any) {
      console.error("Failed to create support group:", error);
      showNotification("error", error.message || "Failed to create support group");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleViewGroup = async (group: any) => {
    // Fetch fresh group data to ensure membership status is up to date
    try {
      const response = await api.getSupportGroup(group.id);
      if (response.ok && response.data) {
        setSelectedGroup(response.data.group);
      } else {
        setSelectedGroup(group);
      }
    } catch (error) {
      console.error("Failed to fetch group details:", error);
      setSelectedGroup(group);
    }
    setView("group-detail");
    setActiveTab("feed");
  };

  const handleCreatePost = async () => {
    if (!newPost.content.trim()) {
      showNotification("error", "Post content is required");
      return;
    }
    if (!selectedGroup) return;
    setIsPosting(true);
    try {
      const response = await api.createPost(selectedGroup.id, newPost);
      if (response.ok) {
        showNotification("success", "Post created successfully!");
        setShowCreatePostModal(false);
        // Clear the post composer
        setNewPost({
          title: "",
          content: "",
          postType: "discussion",
          isAnonymous: false,
        });
        // Refresh the feed
        await fetchGroupDetails();
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      showNotification("error", "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;
    try {
      const response = await api.addComment(postId, { content: newComment });
      if (response.ok) {
        setNewComment("");
        if (selectedPost?.id === postId) {
          const postResponse = await api.getPost(postId);
          if (postResponse.ok) {
            setSelectedPost(postResponse.data.post);
          }
        }
        await fetchGroupDetails();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      showNotification("error", "Failed to add comment");
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      await api.togglePostLike(postId);
      await fetchGroupDetails();
      if (selectedPost?.id === postId) {
        const postResponse = await api.getPost(postId);
        if (postResponse.ok) {
          setSelectedPost(postResponse.data.post);
        }
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleViewPost = async (post: any) => {
    try {
      const response = await api.getPost(post.id);
      if (response.ok) {
        setSelectedPost(response.data.post);
      }
    } catch (error) {
      console.error("Failed to fetch post:", error);
    }
  };

  const getGroupIcon = (group: any) => {
    // First, check group name for specific keywords (highest priority)
    const nameLower = (group.name || "").toLowerCase().replace(/&/g, "and");
    if (
      nameLower.includes("career changer") ||
      nameLower.includes("career changers")
    ) {
      return "mingcute:group-2-line";
    }
    if (
      nameLower.includes("data science") ||
      nameLower.includes("analytics") ||
      (nameLower.includes("data") && nameLower.includes("analytics"))
    ) {
      return "mingcute:chart-pie-2-line";
    }
    
    // Then, try to get industry-specific icon
    if (group.industry) {
      const industryLower = group.industry.toLowerCase();
      if (
        industryLower.includes("software") ||
        industryLower.includes("engineering") ||
        industryLower.includes("developer")
      ) {
        return "mingcute:code-line";
      }
      if (
        industryLower.includes("cybersecurity") ||
        industryLower.includes("security")
      ) {
        return "mingcute:shield-line";
      }
      if (
        industryLower.includes("data") ||
        industryLower.includes("analytics") ||
        industryLower.includes("machine learning")
      ) {
        return "mingcute:chart-pie-2-line";
      }
      if (
        industryLower.includes("design") ||
        industryLower.includes("ui") ||
        industryLower.includes("ux")
      ) {
        return "mingcute:palette-line";
      }
      if (
        industryLower.includes("product") ||
        industryLower.includes("management")
      ) {
        return "mingcute:lightbulb-line";
      }
    }

    // Then check role type
    if (group.role_type) {
      const roleLower = group.role_type.toLowerCase();
      if (roleLower.includes("new grad") || roleLower.includes("entry")) {
        return "mingcute:graduation-cap-line";
      }
      if (roleLower.includes("senior") || roleLower.includes("lead")) {
        return "mingcute:star-line";
      }
      if (
        roleLower.includes("career changer") ||
        roleLower.includes("transition")
      ) {
        return "mingcute:group-2-line";
      }
    }

    // Then check category
    if (group.category) {
      switch (group.category) {
        case "industry":
          return "mingcute:building-line";
        case "role":
          return "mingcute:briefcase-line";
        case "interest":
          return "mingcute:heart-line";
        case "demographic":
          return "mingcute:user-group-line";
        default:
          return "mingcute:community-line";
      }
    }

    // Check group name for other specific keywords
    if (
      nameLower.includes("career changer") ||
      nameLower.includes("career changers")
    ) {
      return "mingcute:group-2-line";
    }
    if (nameLower.includes("interview") || nameLower.includes("prep")) {
      return "mingcute:question-line";
    }
    if (
      nameLower.includes("salary") ||
      nameLower.includes("negotiation") ||
      nameLower.includes("compensation")
    ) {
      return "mingcute:dollar-line";
    }
    if (nameLower.includes("remote") || nameLower.includes("distributed")) {
      return "mingcute:home-line";
    }
    if (nameLower.includes("referral") || nameLower.includes("network")) {
      return "mingcute:share-2-line";
    }

    // Default fallback
    return "mingcute:community-line";
  };

  const getGroupGradient = (group: any) => {
    // Industry-specific gradients
    if (group.industry) {
      const industryLower = group.industry.toLowerCase();
      if (
        industryLower.includes("software") ||
        industryLower.includes("engineering")
      ) {
        return "from-blue-500 to-cyan-500";
      }
      if (
        industryLower.includes("cybersecurity") ||
        industryLower.includes("security")
      ) {
        return "from-purple-500 to-pink-500";
      }
      if (
        industryLower.includes("data") ||
        industryLower.includes("analytics")
      ) {
        return "from-green-500 to-emerald-500";
      }
    }

    // Category-based gradients
    if (group.category) {
      switch (group.category) {
        case "industry":
          return "from-blue-500 to-indigo-500";
        case "role":
          return "from-purple-500 to-pink-500";
        case "interest":
          return "from-rose-500 to-pink-500";
        case "demographic":
          return "from-teal-500 to-cyan-500";
        default:
          return "from-slate-500 to-slate-600";
      }
    }

    // Default gradient
    return "from-blue-500 to-purple-500";
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case "question":
        return "mingcute:question-line";
      case "success_story":
        return "mingcute:star-line";
      case "resource":
        return "mingcute:file-line";
      case "challenge":
        return "mingcute:target-line";
      case "referral":
        return "mingcute:share-2-line";
      default:
        return "mingcute:chat-line";
    }
  };

  if (view === "group-detail" && selectedGroup) {
    return (
      <div className="max-w-7xl mx-auto p-6 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-20 right-6 z-[110] p-4 rounded-xl shadow-lg ${
              notification.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white animate-slide-in-right`}
          >
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => {
              setView("browse");
              setSelectedGroup(null);
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <Icon icon="mingcute:arrow-left-line" width={20} />
            <span>Back to Groups</span>
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getGroupGradient(
                      selectedGroup
                    )} flex items-center justify-center shadow-lg`}
                  >
                    <Icon
                      icon={getGroupIcon(selectedGroup)}
                      width={32}
                      className="text-white"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                      {selectedGroup.name}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Icon icon="mingcute:user-line" width={16} />
                        {selectedGroup.member_count || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon icon="mingcute:chat-line" width={16} />
                        {selectedGroup.post_count || 0} posts
                      </span>
                      <span className="capitalize px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {selectedGroup.category}
                      </span>
                    </div>
                  </div>
                </div>
                {selectedGroup.description && (
                  <p className="text-slate-700 mt-4 leading-relaxed">
                    {selectedGroup.description}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                {selectedGroup.is_member ? (
                  <button
                    onClick={() => handleLeaveGroup(selectedGroup.id)}
                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                  >
                    Leave Group
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinGroup(selectedGroup.id)}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-md"
                  >
                    Join Group
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 border border-slate-200">
          <div className="flex border-b border-slate-200">
            {[
              { id: "feed", label: "Feed", icon: "mingcute:chat-line" },
              {
                id: "resources",
                label: "Resources",
                icon: "mingcute:file-line",
              },
              {
                id: "challenges",
                label: "Challenges",
                icon: "mingcute:target-line",
              },
              {
                id: "referrals",
                label: "Referrals",
                icon: "mingcute:share-2-line",
              },
              {
                id: "members",
                label: "Members",
                icon: "mingcute:user-group-line",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Icon icon={tab.icon} width={20} />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "feed" && (
              <>
                {selectedGroup.is_member && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                    {/* Social Media Style Post Composer */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                          <Icon
                            icon="mingcute:user-line"
                            width={24}
                            className="text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={newPost.content}
                            onChange={(e) =>
                              setNewPost({
                                ...newPost,
                                content: e.target.value,
                              })
                            }
                            placeholder="What's on your mind?"
                            className="w-full p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Post Options Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setShowCreatePostModal(true)}
                            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
                          >
                            <Icon icon="mingcute:image-line" width={20} />
                            <span>Photo</span>
                          </button>
                          <button
                            onClick={() => setShowCreatePostModal(true)}
                            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium"
                          >
                            <Icon icon="mingcute:file-line" width={20} />
                            <span>File</span>
                          </button>
                          <select
                            value={newPost.postType}
                            onChange={(e) =>
                              setNewPost({
                                ...newPost,
                                postType: e.target.value,
                              })
                            }
                            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="discussion">Discussion</option>
                            <option value="question">Question</option>
                            <option value="success_story">Success Story</option>
                            <option value="resource">Resource</option>
                            <option value="referral">Referral</option>
                          </select>
                          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newPost.isAnonymous}
                              onChange={(e) =>
                                setNewPost({
                                  ...newPost,
                                  isAnonymous: e.target.checked,
                                })
                              }
                              className="w-4 h-4"
                            />
                            <span>Post anonymously</span>
                          </label>
                        </div>
                        <button
                          onClick={handleCreatePost}
                          disabled={!newPost.content.trim() || isPosting}
                          className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                            newPost.content.trim() && !isPosting
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg"
                              : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isPosting ? "Posting..." : "Post"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {isLoadingGroup ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading posts...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                    <Icon
                      icon="mingcute:chat-line"
                      width={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-slate-600">
                      No posts yet. Be the first to share!
                    </p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => handleViewPost(post)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                          {post.is_anonymous ? (
                            <Icon
                              icon="mingcute:user-line"
                              width={24}
                              className="text-white"
                            />
                          ) : post.user_profile_picture ? (
                            <img
                              src={post.user_profile_picture}
                              alt={post.display_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <Icon
                              icon="mingcute:user-line"
                              width={24}
                              className="text-white"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-slate-900">
                              {post.display_name || "Anonymous"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(post.created_at).toLocaleDateString()}
                            </span>
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs flex items-center gap-1">
                              <Icon
                                icon={getPostTypeIcon(post.post_type)}
                                width={14}
                              />
                              {post.post_type.replace("_", " ")}
                            </span>
                          </div>
                          {post.title && (
                            <h3 className="font-bold text-lg text-slate-900 mb-2">
                              {post.title}
                            </h3>
                          )}
                          <p className="text-slate-700 mb-4 line-clamp-3">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-4 text-slate-600">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLike(post.id);
                              }}
                              className={`flex items-center gap-2 hover:text-blue-600 transition-colors ${
                                post.is_liked ? "text-blue-600" : ""
                              }`}
                            >
                              <Icon
                                icon={
                                  post.is_liked
                                    ? "mingcute:heart-fill"
                                    : "mingcute:heart-line"
                                }
                                width={20}
                              />
                              <span>{post.like_count || 0}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <Icon icon="mingcute:chat-line" width={20} />
                              <span>{post.comment_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === "resources" && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                {selectedGroup?.is_member && (
                  <div className="mb-6 pb-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Group Resources
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          AI-generated articles and advice tailored to this
                          group
                        </p>
                      </div>
                    <button
                      onClick={async () => {
                        if (!selectedGroup) return;
                        setIsGeneratingResources(true);
                        try {
                          const response = await api.generateGroupResources(
                            selectedGroup.id,
                              "general"
                          );
                          if (response.ok) {
                            showNotification(
                              "success",
                                "Resources generated successfully!"
                            );
                            await fetchGroupDetails();
                          }
                        } catch (error) {
                            console.error(
                              "Failed to generate resources:",
                              error
                            );
                          showNotification(
                            "error",
                            "Failed to generate resources"
                          );
                        } finally {
                          setIsGeneratingResources(false);
                        }
                      }}
                      disabled={isGeneratingResources}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        {isGeneratingResources ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Icon icon="mingcute:magic-line" width={20} />
                            <span>Generate Resources</span>
                          </>
                        )}
                    </button>
                    </div>
                  </div>
                )}
                {isLoadingGroup ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon
                      icon="mingcute:file-line"
                      width={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-slate-600 mb-4">
                      No resources available yet.
                    </p>
                    {selectedGroup?.is_member && (
                      <p className="text-sm text-slate-500">
                        Use the button above to generate AI-powered resources,
                        or they will be automatically generated in the
                        background.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Articles Section */}
                    {resources.filter(
                      (r) =>
                        r.resource_type === "article" && r.url && r.url !== "#"
                    ).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Icon icon="mingcute:article-line" width={20} />
                          Articles & Resources
                        </h3>
                  <div className="space-y-4">
                          {resources
                            .filter(
                              (r) =>
                                r.resource_type === "article" &&
                                r.url &&
                                r.url !== "#"
                            )
                            .map((resource) => (
                      <div
                        key={resource.id}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                      >
                                <h4 className="font-semibold text-slate-900 mb-2">
                          {resource.title}
                                </h4>
                                {resource.description && (
                                  <p className="text-sm text-slate-600 mb-3">
                                    {resource.description}
                                  </p>
                                )}
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium inline-flex items-center gap-1"
                                >
                                  <span>Read Article</span>
                                  <Icon
                                    icon="mingcute:external-link-line"
                                    width={16}
                                  />
                                </a>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* AI-Generated Advice Section */}
                    {resources.filter(
                      (r) => r.resource_type === "guide" && r.content
                    ).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Icon icon="mingcute:lightbulb-line" width={20} />
                          AI-Generated Advice
                        </h3>
                        <div className="space-y-4">
                          {resources
                            .filter(
                              (r) => r.resource_type === "guide" && r.content
                            )
                            .map((resource) => (
                              <div
                                key={resource.id}
                                className="p-5 border border-slate-200 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-300 hover:shadow-md transition-all"
                              >
                                <h4 className="font-semibold text-slate-900 mb-3 text-lg">
                                  {resource.title}
                                </h4>
                                {resource.content && (
                                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {resource.content}
                                  </div>
                                )}
                                {resource.description && !resource.content && (
                                  <p className="text-sm text-slate-600">
                                    {resource.description}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Other Resources Section */}
                    {resources.filter(
                      (r) =>
                        r.resource_type !== "article" &&
                        r.resource_type !== "guide" &&
                        (!r.content || r.url)
                    ).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                          <Icon icon="mingcute:file-line" width={20} />
                          Additional Resources
                        </h3>
                        <div className="space-y-4">
                          {resources
                            .filter(
                              (r) =>
                                r.resource_type !== "article" &&
                                r.resource_type !== "guide" &&
                                (!r.content || r.url)
                            )
                            .map((resource) => (
                              <div
                                key={resource.id}
                                className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                              >
                                <h4 className="font-semibold text-slate-900 mb-2">
                                  {resource.title}
                                </h4>
                        {resource.description && (
                          <p className="text-sm text-slate-600 mb-3">
                            {resource.description}
                          </p>
                        )}
                                {resource.url && resource.url !== "#" && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium inline-flex items-center gap-1"
                          >
                            <span>View Resource</span>
                            <Icon
                              icon="mingcute:external-link-line"
                              width={16}
                            />
                          </a>
                        )}
                      </div>
                    ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "challenges" && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                {isLoadingGroup ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon
                      icon="mingcute:target-line"
                      width={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-slate-600">
                      No active challenges. Challenges are automatically
                      generated in the background.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Month Header */}
                    {challenges.length > 0 && challenges[0].start_date && (
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                          <Icon
                            icon="mingcute:calendar-line"
                            width={28}
                            className="text-blue-500"
                          />
                          {new Date(challenges[0].start_date).toLocaleString(
                            "default",
                            {
                              month: "long",
                              year: "numeric",
                            }
                          )}{" "}
                          Challenges
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                          AI-generated challenges tailored to this group
                        </p>
                      </div>
                    )}

                    {/* Challenges List */}
                  <div className="space-y-4">
                    {challenges.map((challenge) => (
                      <div
                        key={challenge.id}
                          className="p-6 border border-slate-200 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-slate-900 mb-2">
                            {challenge.title}
                          </h3>
                              <p className="text-slate-700 mb-4 leading-relaxed">
                                {challenge.description}
                              </p>
                              {challenge.target_metric &&
                                challenge.target_value && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                                    <Icon
                                      icon="mingcute:target-line"
                                      width={16}
                                    />
                                    <span>
                                      Goal: {challenge.target_value}{" "}
                                      {challenge.target_metric.replace(
                                        /_/g,
                                        " "
                                      )}
                                    </span>
                                  </div>
                                )}
                            </div>
                          {!challenge.is_participating && (
                            <button
                                onClick={async () => {
                                  try {
                                    await api.joinChallenge(challenge.id);
                                    await fetchGroupDetails();
                                    showNotification(
                                      "success",
                                      "Joined challenge!"
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Failed to join challenge:",
                                      error
                                    );
                                    showNotification(
                                      "error",
                                      "Failed to join challenge"
                                    );
                                  }
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg ml-4 flex-shrink-0"
                              >
                                Join Challenge
                            </button>
                          )}
                        </div>
                        {challenge.is_participating && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-700 font-medium">
                                Your Progress
                              </span>
                              <span className="font-semibold text-blue-600">
                                {challenge.user_progress || 0} /{" "}
                                {challenge.target_value || "?"}
                              </span>
                            </div>
                              <div className="w-full bg-slate-200 rounded-full h-3">
                              <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    ((challenge.user_progress || 0) /
                                      (challenge.target_value || 1)) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                              <p className="text-xs text-slate-500 mt-2">
                                Keep going! You're making great progress.
                              </p>
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "members" && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                {isLoadingGroup ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon
                      icon="mingcute:user-group-line"
                      width={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-slate-600">No members yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          console.log("Member clicked:", member.user_id);
                          setSelectedMember(member);
                          setMemberProfile(null); // Reset previous profile
                          setIsLoadingProfile(true);
                          try {
                            const response = await api.getAbstractUserProfile(member.user_id);
                            if (response.ok && response.data) {
                              setMemberProfile(response.data.profile);
                            } else {
                              console.error("Failed to load member profile:", response);
                            }
                          } catch (error) {
                            console.error("Failed to load member profile:", error);
                          } finally {
                            setIsLoadingProfile(false);
                          }
                        }}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {member.profile_picture ? (
                            <img
                              src={member.profile_picture}
                              alt={member.first_name || member.email}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                              <Icon
                                icon="mingcute:user-line"
                                width={24}
                                className="text-white"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {member.first_name && member.last_name
                                ? `${member.first_name} ${member.last_name}`
                                : member.email?.split("@")[0] || "Member"}
                            </div>
                            {member.role && (
                              <span className="text-xs text-slate-500 capitalize">
                                {member.role}
                              </span>
                            )}
                          </div>
                        </div>
                        {member.bio && (
                          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                            {member.bio}
                          </p>
                        )}
                        {member.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Icon icon="mingcute:map-pin-line" width={14} />
                            {member.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "referrals" && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                {isLoadingGroup ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon
                      icon="mingcute:share-2-line"
                      width={48}
                      className="mx-auto text-slate-300 mb-4"
                    />
                    <p className="text-slate-600">
                      No referrals available yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="p-6 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900">
                              {referral.role_title}
                            </h3>
                            <p className="text-slate-600">
                              {referral.company_name}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Active
                          </span>
                        </div>
                        {referral.description && (
                          <p className="text-slate-700 mb-3">
                            {referral.description}
                          </p>
                        )}
                        {referral.location && (
                          <p className="text-sm text-slate-600 flex items-center gap-1 mb-3">
                            <Icon icon="mingcute:map-pin-line" width={16} />
                            {referral.location}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span>
                            Posted by {referral.display_name || "Anonymous"}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(referral.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">Group Info</h3>
              <div className="space-y-3 text-sm">
                {selectedGroup.industry && (
                  <div>
                    <span className="text-slate-600">Industry:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {selectedGroup.industry}
                    </span>
                  </div>
                )}
                {selectedGroup.role_type && (
                  <div>
                    <span className="text-slate-600">Role Type:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {selectedGroup.role_type}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Post Modal */}
        {showCreatePostModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  Create Post
                </h2>
                <button
                  onClick={() => setShowCreatePostModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="mingcute:close-line" width={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Post Type
                  </label>
                  <select
                    value={newPost.postType}
                    onChange={(e) =>
                      setNewPost({ ...newPost, postType: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl"
                  >
                    <option value="discussion">Discussion</option>
                    <option value="question">Question</option>
                    <option value="success_story">Success Story</option>
                    <option value="resource">Resource</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title (optional)
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) =>
                      setNewPost({ ...newPost, title: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl"
                    placeholder="Enter post title..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) =>
                      setNewPost({ ...newPost, content: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl h-32"
                    placeholder="Share your thoughts..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={newPost.isAnonymous}
                    onChange={(e) =>
                      setNewPost({ ...newPost, isAnonymous: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <label htmlFor="anonymous" className="text-sm text-slate-700">
                    Post anonymously
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreatePostModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={isPosting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
                  >
                    {isPosting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  Post Details
                </h2>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon icon="mingcute:close-line" width={24} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                      {selectedPost.is_anonymous ? (
                        <Icon
                          icon="mingcute:user-line"
                          width={24}
                          className="text-white"
                        />
                      ) : selectedPost.user_profile_picture ? (
                        <img
                          src={selectedPost.user_profile_picture}
                          alt={selectedPost.display_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Icon
                          icon="mingcute:user-line"
                          width={24}
                          className="text-white"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {selectedPost.display_name || "Anonymous"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(selectedPost.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {selectedPost.title && (
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      {selectedPost.title}
                    </h3>
                  )}
                  <div className="prose max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedPost.content}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h4 className="font-bold text-slate-900 mb-4">
                    Comments ({selectedPost.comments?.length || 0})
                  </h4>
                  <div className="space-y-4 mb-4">
                    {selectedPost.comments?.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center flex-shrink-0">
                          {comment.is_anonymous ? (
                            <Icon
                              icon="mingcute:user-line"
                              width={20}
                              className="text-white"
                            />
                          ) : comment.user_profile_picture ? (
                            <img
                              src={comment.user_profile_picture}
                              alt={comment.display_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Icon
                              icon="mingcute:user-line"
                              width={20}
                              className="text-white"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-slate-900 mb-1">
                            {comment.display_name || "Anonymous"}
                          </div>
                          <p className="text-slate-700">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 p-3 border border-slate-300 rounded-xl"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && newComment.trim()) {
                          handleAddComment(selectedPost.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(selectedPost.id)}
                      disabled={!newComment.trim()}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-[110] p-4 rounded-xl shadow-lg ${
            notification.type === "success" ? "bg-green-500" : "bg-red-500"
          } text-white animate-slide-in-right`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Support Groups
          </h1>
          <p className="text-lg text-slate-600">
            Connect with peers, share experiences, and grow together
          </p>
        </div>
        <button
          onClick={() => setShowCreateGroupModal(true)}
          className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Icon icon="mingcute:add-line" width={20} />
          Create Group
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg mb-6 border border-slate-200">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setView("browse")}
            className={`flex-1 px-6 py-4 font-medium transition-colors text-center ${
              view === "browse"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Browse Groups
          </button>
          <button
            onClick={() => setView("my-groups")}
            className={`flex-1 px-6 py-4 font-medium transition-colors text-center ${
              view === "my-groups"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            My Groups ({myGroups.length})
          </button>
        </div>
      </div>

      {/* Filters (Browse View) */}
      {view === "browse" && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search groups..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="p-3 border border-slate-300 rounded-xl"
            />
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="p-3 border border-slate-300 rounded-xl"
            >
              <option value="">All Categories</option>
              <option value="industry">Industry</option>
              <option value="role">Role</option>
              <option value="interest">Interest</option>
              <option value="demographic">Demographic</option>
            </select>
            <input
              type="text"
              placeholder="Industry..."
              value={filters.industry}
              onChange={(e) =>
                setFilters({ ...filters, industry: e.target.value })
              }
              className="p-3 border border-slate-300 rounded-xl"
            />
            <input
              type="text"
              placeholder="Role Type..."
              value={filters.roleType}
              onChange={(e) =>
                setFilters({ ...filters, roleType: e.target.value })
              }
              className="p-3 border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Groups List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading groups...</p>
        </div>
      ) : (view === "browse" ? groups : myGroups).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Icon
            icon="mingcute:community-line"
            width={64}
            className="mx-auto text-slate-300 mb-4"
          />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {view === "browse"
              ? "No groups found"
              : "You haven't joined any groups yet"}
          </h2>
          <p className="text-slate-600">
            {view === "browse"
              ? "Try adjusting your filters or check back later for new groups."
              : "Browse groups to find communities that match your interests."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(view === "browse" ? groups : myGroups).map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-2xl transition-all cursor-pointer overflow-hidden group flex flex-col"
              onClick={() => handleViewGroup(group)}
            >
              {/* Header with gradient background */}
              <div
                className={`h-24 bg-gradient-to-br ${getGroupGradient(
                  group
                )} relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute bottom-4 left-6 right-6 flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg`}
                  >
                    <Icon
                      icon={getGroupIcon(group)}
                      width={28}
                      className="text-white"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white mb-1 line-clamp-1 drop-shadow-lg">
                      {group.name}
                    </h3>
                    {group.category && (
                      <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium capitalize border border-white/30">
                        {group.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                {group.description && (
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {group.description}
                  </p>
                )}

                {/* Group metadata */}
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4 pb-4 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Icon
                      icon="mingcute:user-line"
                      width={16}
                      className="text-slate-400"
                    />
                    <span className="font-medium">
                      {group.member_count || 0}
                    </span>
                    <span className="text-slate-400">members</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Icon
                      icon="mingcute:chat-line"
                      width={16}
                      className="text-slate-400"
                    />
                    <span className="font-medium">{group.post_count || 0}</span>
                    <span className="text-slate-400">posts</span>
                  </span>
                </div>

                {/* Additional info */}
                {(group.industry || group.role_type) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {group.industry && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                        {group.industry}
                      </span>
                    )}
                    {group.role_type && (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                        {group.role_type}
                      </span>
                    )}
                  </div>
                )}

                {/* Action button */}
                <div className="mt-auto">
                  {view === "my-groups" || group.is_member ? (
                    // For "My Groups" view or if already a member, show "View Group" button
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewGroup(group);
                      }}
                      className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon icon="mingcute:arrow-right-line" width={18} />
                        View Group
                      </span>
                    </button>
                  ) : (
                    // For "Browse" view and not a member, show "Join Group" button
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinGroup(group.id);
                      }}
                      className={`w-full py-3 rounded-xl font-semibold transition-all bg-gradient-to-r ${getGroupGradient(
                        group
                      )} text-white hover:shadow-lg transform hover:scale-[1.02]`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Icon icon="mingcute:add-line" width={18} />
                        Join Group
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Create Support Group
              </h2>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  className="w-full p-3 border border-slate-300 rounded-xl"
                  placeholder="e.g., Software Engineering Support"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, description: e.target.value })
                  }
                  className="w-full p-3 border border-slate-300 rounded-xl h-24"
                  placeholder="Describe your support group..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={newGroup.category}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, category: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl"
                  >
                    <option value="general">General</option>
                    <option value="industry">Industry</option>
                    <option value="role">Role</option>
                    <option value="interest">Interest</option>
                    <option value="demographic">Demographic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={newGroup.industry}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, industry: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-xl"
                    placeholder="e.g., Software Engineering"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role Type
                </label>
                <input
                  type="text"
                  value={newGroup.roleType}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, roleType: e.target.value })
                  }
                  className="w-full p-3 border border-slate-300 rounded-xl"
                  placeholder="e.g., New Grad, Senior, Career Changer"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newGroup.isPublic}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, isPublic: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm text-slate-700">
                  Make this group public
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={isCreatingGroup}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {isCreatingGroup ? "Creating..." : "Create Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Profile Modal - Abstract View - Rendered via Portal */}
      {selectedMember && (() => {
        if (typeof window === 'undefined' || !window.document) return null;
        console.log("Rendering modal via portal for:", selectedMember.user_id);
        return createPortal(
          <div
            key={`modal-${selectedMember.user_id}`} 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            style={{ 
              position: 'fixed', 
              zIndex: 9999,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedMember(null);
                setMemberProfile(null);
              }
            }}
          >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Member Overview
              </h2>
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setMemberProfile(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon icon="mingcute:close-line" width={24} />
              </button>
            </div>
            <div className="p-6">
              {isLoadingProfile ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-slate-600 mt-4">Loading profile...</p>
                </div>
              ) : memberProfile ? (
                <div className="space-y-6">
                  {/* Experience Summary */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Icon icon="mingcute:briefcase-line" width={20} />
                      Experience Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {memberProfile.experience.yearsOfExperience > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {memberProfile.experience.yearsOfExperience}
                          </p>
                          <p className="text-sm text-slate-600">Years Experience</p>
                  </div>
                )}
                      {memberProfile.experience.experienceLevel && (
                <div>
                          <p className="text-lg font-semibold text-slate-900 capitalize">
                            {memberProfile.experience.experienceLevel}
                          </p>
                          <p className="text-sm text-slate-600">Level</p>
                        </div>
                      )}
                      {memberProfile.experience.totalPositions > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {memberProfile.experience.totalPositions}
                          </p>
                          <p className="text-sm text-slate-600">Positions</p>
                        </div>
                      )}
                      {memberProfile.experience.companiesWorked > 0 && (
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {memberProfile.experience.companiesWorked}
                          </p>
                          <p className="text-sm text-slate-600">Companies</p>
                        </div>
                      )}
                    </div>
                    {memberProfile.experience.primaryIndustry && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-600">Primary Industry</p>
                        <p className="text-base font-medium text-slate-900 capitalize">
                          {memberProfile.experience.primaryIndustry}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Skills Summary */}
                  {memberProfile.skills.totalSkills > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-100">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Icon icon="mingcute:star-line" width={20} />
                        Skills Overview
                  </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-2xl font-bold text-purple-600 mb-1">
                            {memberProfile.skills.totalSkills}
                          </p>
                          <p className="text-sm text-slate-600">Total Skills</p>
                        </div>
                        {memberProfile.skills.categories.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Skill Categories
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {memberProfile.skills.categories.map((cat: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium capitalize"
                                >
                                  {cat}
                    </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Object.keys(memberProfile.skills.proficiencyDistribution).length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Proficiency Distribution
                            </p>
                            <div className="space-y-2">
                              {Object.entries(memberProfile.skills.proficiencyDistribution).map(
                                ([level, count]: [string, any]) => (
                                  <div key={level} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 capitalize w-20">
                                      {level}:
                                    </span>
                                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                                      <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{
                                          width: `${(count / memberProfile.skills.totalSkills) * 100}%`,
                                        }}
                                      ></div>
                </div>
                                    <span className="text-xs font-medium text-slate-700 w-8">
                                      {count}
                                    </span>
              </div>
                                )
                              )}
                            </div>
                </div>
              )}
                      </div>
                    </div>
                  )}

                  {/* Education Summary */}
                  {memberProfile.education.totalDegrees > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Icon icon="mingcute:graduation-line" width={20} />
                        Education Overview
                      </h3>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-green-600">
                          {memberProfile.education.totalDegrees}
                        </p>
                        <p className="text-sm text-slate-600 mb-3">Degrees</p>
                        {memberProfile.education.degrees.map((deg: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white rounded-lg"
                          >
                            <span className="text-sm font-medium text-slate-900 capitalize">
                              {deg.type}
                            </span>
                            {deg.field && (
                              <span className="text-xs text-slate-600">{deg.field}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Search Metrics */}
                  {memberProfile.jobSearchMetrics.totalOpportunities > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-xl border border-orange-100">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Icon icon="mingcute:target-line" width={20} />
                        Job Search Activity
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                          <p className="text-2xl font-bold text-orange-600">
                            {memberProfile.jobSearchMetrics.totalOpportunities}
                          </p>
                          <p className="text-sm text-slate-600">Opportunities</p>
                        </div>
                        {memberProfile.jobSearchMetrics.applicationResponseRate > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-orange-600">
                              {memberProfile.jobSearchMetrics.applicationResponseRate}%
                            </p>
                            <p className="text-sm text-slate-600">Response Rate</p>
                  </div>
                )}
                        {memberProfile.jobSearchMetrics.interviewConversionRate > 0 && (
                  <div>
                            <p className="text-2xl font-bold text-orange-600">
                              {memberProfile.jobSearchMetrics.interviewConversionRate}%
                            </p>
                            <p className="text-sm text-slate-600">Interview Rate</p>
                  </div>
                )}
                        {memberProfile.jobSearchMetrics.offerConversionRate > 0 && (
                          <div>
                            <p className="text-2xl font-bold text-orange-600">
                              {memberProfile.jobSearchMetrics.offerConversionRate}%
                            </p>
                            <p className="text-sm text-slate-600">Offer Rate</p>
              </div>
                        )}
                      </div>
                <div>
                        <p className="text-sm text-slate-600 mb-1">Activity Level</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            memberProfile.jobSearchMetrics.activityLevel === "high"
                              ? "bg-green-100 text-green-700"
                              : memberProfile.jobSearchMetrics.activityLevel === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : memberProfile.jobSearchMetrics.activityLevel === "low"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {memberProfile.jobSearchMetrics.activityLevel}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    {memberProfile.certifications.total > 0 && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon icon="mingcute:award-line" width={18} />
                          <h4 className="font-semibold text-slate-900">Certifications</h4>
                        </div>
                        <p className="text-2xl font-bold text-slate-700">
                          {memberProfile.certifications.total}
                        </p>
                      </div>
                    )}
                    {memberProfile.projects.total > 0 && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon icon="mingcute:folder-line" width={18} />
                          <h4 className="font-semibold text-slate-900">Projects</h4>
                        </div>
                        <p className="text-2xl font-bold text-slate-700">
                          {memberProfile.projects.total}
                        </p>
                        {memberProfile.projects.industriesCovered > 0 && (
                          <p className="text-xs text-slate-600 mt-1">
                            Across {memberProfile.projects.industriesCovered} industries
                          </p>
                        )}
                </div>
              )}
            </div>
          </div>
              ) : (
                <div className="text-center py-12">
                  <Icon
                    icon="mingcute:user-line"
                    width={48}
                    className="mx-auto text-slate-300 mb-4"
                  />
                  <p className="text-slate-600 mb-2">No profile data available</p>
                  <p className="text-sm text-slate-500">
                    This member hasn't added profile information yet.
                  </p>
        </div>
      )}
            </div>
          </div>
        </div>,
        window.document.body
        );
      })()}
    </div>
  );
}
