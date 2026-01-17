import { useState, useEffect } from "react";
import { useAdmin } from "../hooks/useAdmin";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletAdapterNetwork, Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from "../deployed_program";
import { Stamp, Task, VerificationRequest } from "../types";
import { formatAddress, hashString } from "../utils/aleo";
import { logger } from "../utils/logger";
import { initializeSampleData } from "../utils/sampleData";
import "./Admin.css";

type WalletAdapterExtras = {
    requestTransaction?: (tx: Transaction) => Promise<string>;
};


export const Admin = () => {
    const { publicKey, wallet } = useWallet();
    const adapter = wallet?.adapter as unknown as WalletAdapterExtras | undefined;
    const network = WalletAdapterNetwork.TestnetBeta;
    const { isAdmin, checking, createStamp, editStamp, deleteStamp, createTask, editTask, deleteTask, verifyAndGrantStamp } = useAdmin();
    const [stamps, setStamps] = useState<Stamp[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
    const [activeTab, setActiveTab] = useState<"stamps" | "tasks" | "verifications">("stamps");
    
    // Stamp form state
    const [showStampModal, setShowStampModal] = useState(false);
    const [editingStamp, setEditingStamp] = useState<Stamp | null>(null);
    const [stampForm, setStampForm] = useState({
        name: "",
        description: "",
        category: "",
        points: 0,
        is_active: true,
    });

    // Task form state
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedStampForTask, setSelectedStampForTask] = useState<number | null>(null);
    const [taskForm, setTaskForm] = useState({
        stamp_id: 0,
        task_type: 1,
        requirement: "",
        verification_data: "",
        is_active: true,
    });

    // Verification state
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyForm, setVerifyForm] = useState({
        user: "",
        stamp_id: 0,
        verification_hash: "",
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");

    useEffect(() => {
        // Initialize sample data if needed
        initializeSampleData();

        // Load stamps and tasks from localStorage (in production, from blockchain)
        const savedStamps = localStorage.getItem("stamps");
        if (savedStamps) {
            try {
                setStamps(JSON.parse(savedStamps));
            } catch (e) {
                console.error("Failed to parse stamps:", e);
            }
        }

        const savedTasks = localStorage.getItem("tasks");
        if (savedTasks) {
            try {
                setTasks(JSON.parse(savedTasks));
            } catch (e) {
                console.error("Failed to parse tasks:", e);
            }
        }

        // Load verification requests
        const savedRequests = localStorage.getItem("verification_requests");
        if (savedRequests) {
            try {
                const parsed = JSON.parse(savedRequests);
                setVerificationRequests(parsed.filter((r: VerificationRequest) => r.status === 0)); // Only pending
            } catch (e) {
                console.error("Failed to parse verification requests:", e);
            }
        }

        // Listen for new verification requests
        const handleNewRequest = () => {
            const savedRequests = localStorage.getItem("verification_requests");
            if (savedRequests) {
                try {
                    const parsed = JSON.parse(savedRequests);
                    setVerificationRequests(parsed.filter((r: VerificationRequest) => r.status === 0));
                } catch (e) {
                    console.error("Failed to parse verification requests:", e);
                }
            }
        };

        window.addEventListener("verification-request", handleNewRequest);
        return () => window.removeEventListener("verification-request", handleNewRequest);
    }, []);

    const handleCreateStamp = async () => {
        setIsProcessing(true);
        setStatus("Creating stamp...");

        try {
            const txId = await createStamp(
                stampForm.name,
                stampForm.description,
                stampForm.category,
                stampForm.points
            );

            if (txId) {
                // Add to local state (in production, would be fetched from blockchain)
                const newStamp: Stamp = {
                    stamp_id: stamps.length + 1,
                    name: stampForm.name,
                    description: stampForm.description,
                    category: stampForm.category,
                    points: stampForm.points,
                    is_active: stampForm.is_active,
                };

                const updated = [...stamps, newStamp];
                setStamps(updated);
                localStorage.setItem("stamps", JSON.stringify(updated));

                setStatus("Stamp created successfully!");
                setShowStampModal(false);
                resetStampForm();
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditStamp = async () => {
        if (!editingStamp) return;

        setIsProcessing(true);
        setStatus("Updating stamp...");

        try {
            const txId = await editStamp(
                editingStamp.stamp_id,
                stampForm.name,
                stampForm.description,
                stampForm.category,
                stampForm.points,
                stampForm.is_active
            );

            if (txId) {
                // Update local state
                const updated = stamps.map(s => 
                    s.stamp_id === editingStamp.stamp_id 
                        ? { ...s, ...stampForm }
                        : s
                );
                setStamps(updated);
                localStorage.setItem("stamps", JSON.stringify(updated));

                setStatus("Stamp updated successfully!");
                setShowStampModal(false);
                setEditingStamp(null);
                resetStampForm();
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteStamp = async (stampId: number) => {
        if (!confirm("Are you sure you want to delete this stamp? This will set it to inactive.")) {
            return;
        }

        setIsProcessing(true);
        setStatus("Deleting stamp...");

        try {
            const txId = await deleteStamp(stampId);

            if (txId) {
                // Update local state
                const updated = stamps.map(s => 
                    s.stamp_id === stampId 
                        ? { ...s, is_active: false }
                        : s
                );
                setStamps(updated);
                localStorage.setItem("stamps", JSON.stringify(updated));

                setStatus("Stamp deleted successfully!");
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateTask = async () => {
        setIsProcessing(true);
        setStatus("Creating task...");

        try {
            const txId = await createTask(
                taskForm.stamp_id,
                taskForm.task_type,
                taskForm.requirement,
                taskForm.verification_data
            );

            if (txId) {
                // Add to local state
                const newTask: Task = {
                    task_id: tasks.length + 1,
                    stamp_id: taskForm.stamp_id,
                    task_type: taskForm.task_type,
                    requirement: taskForm.requirement,
                    verification_data: taskForm.verification_data,
                    is_active: taskForm.is_active,
                };

                const updated = [...tasks, newTask];
                setTasks(updated);
                localStorage.setItem("tasks", JSON.stringify(updated));

                setStatus("Task created successfully!");
                setShowTaskModal(false);
                setEditingTask(null);
                resetTaskForm();
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditTask = async () => {
        if (!editingTask) return;

        setIsProcessing(true);
        setStatus("Updating task...");

        try {
            const txId = await editTask(
                editingTask.task_id,
                taskForm.stamp_id,
                taskForm.task_type,
                taskForm.requirement,
                taskForm.verification_data,
                taskForm.is_active
            );

            if (txId) {
                // Update local state
                const updated = tasks.map(t => 
                    t.task_id === editingTask.task_id 
                        ? { ...t, ...taskForm }
                        : t
                );
                setTasks(updated);
                localStorage.setItem("tasks", JSON.stringify(updated));

                setStatus("Task updated successfully!");
                setShowTaskModal(false);
                setEditingTask(null);
                resetTaskForm();
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm("Are you sure you want to delete this task? This will set it to inactive.")) {
            return;
        }

        setIsProcessing(true);
        setStatus("Deleting task...");

        try {
            const txId = await deleteTask(taskId);

            if (txId) {
                // Update local state
                const updated = tasks.map(t => 
                    t.task_id === taskId 
                        ? { ...t, is_active: false }
                        : t
                );
                setTasks(updated);
                localStorage.setItem("tasks", JSON.stringify(updated));

                setStatus("Task deleted successfully!");
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyAndGrant = async (request?: VerificationRequest) => {
        setIsProcessing(true);
        setStatus("Granting stamp...");

        try {
            const user = request?.user || verifyForm.user;
            const stampId = request?.stamp_id || verifyForm.stamp_id;
            const hash = request?.proof ? await hashString(request.proof) : verifyForm.verification_hash;

            const txId = await verifyAndGrantStamp(user, stampId, hash);

            if (txId) {
                // Update verification request status
                if (request) {
                    const allRequests = JSON.parse(localStorage.getItem("verification_requests") || "[]");
                    const updated = allRequests.map((r: VerificationRequest) => 
                        r.request_id === request.request_id 
                            ? { ...r, status: 1 } // approved
                            : r
                    );
                    localStorage.setItem("verification_requests", JSON.stringify(updated));
                    setVerificationRequests(updated.filter((r: VerificationRequest) => r.status === 0));
                    
                    // Update user stamps
                    const userStamps = JSON.parse(localStorage.getItem(`user_stamps_${user}`) || "[]");
                    if (!userStamps.includes(stampId)) {
                        userStamps.push(stampId);
                        localStorage.setItem(`user_stamps_${user}`, JSON.stringify(userStamps));
                        
                        // Trigger event for UI updates
                        window.dispatchEvent(new CustomEvent("stamp-granted"));
                    }
                }

                setStatus("Stamp granted successfully!");
                setShowVerifyModal(false);
                resetVerifyForm();
            }
        } catch (error) {
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleInitialize = async () => {
        if (!publicKey || !adapter?.requestTransaction) {
            alert("Please connect your wallet first");
            return;
        }

        setIsProcessing(true);
        setStatus("Initializing contract...");

        try {
            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "initialize",
                [publicKey],
                50000,
                false
            );

            setStatus("Please confirm the transaction in your wallet...");
            const txId = await adapter.requestTransaction(transaction);

            if (txId) {
                logger.transaction.confirmed(txId);
                
                // Add as admin in localStorage
                const adminAddresses = JSON.parse(localStorage.getItem("admin_addresses") || "[]");
                if (!adminAddresses.includes(publicKey)) {
                    adminAddresses.push(publicKey);
                    localStorage.setItem("admin_addresses", JSON.stringify(adminAddresses));
                }
                
                setStatus("Contract initialized! You are now the first admin.");
                
                // Refresh admin status
                window.location.reload();
            }
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const resetStampForm = () => {
        setStampForm({
            name: "",
            description: "",
            category: "",
            points: 0,
            is_active: true,
        });
    };

    const resetTaskForm = () => {
        setTaskForm({
            stamp_id: selectedStampForTask || 0,
            task_type: 1,
            requirement: "",
            verification_data: "",
            is_active: true,
        });
    };

    const resetVerifyForm = () => {
        setVerifyForm({
            user: "",
            stamp_id: 0,
            verification_hash: "",
        });
    };

    const openEditStamp = (stamp: Stamp) => {
        setEditingStamp(stamp);
        setStampForm({
            name: stamp.name,
            description: stamp.description,
            category: stamp.category,
            points: stamp.points,
            is_active: stamp.is_active,
        });
        setShowStampModal(true);
    };

    const openEditTask = (task: Task) => {
        setEditingTask(task);
        setTaskForm({
            stamp_id: task.stamp_id,
            task_type: task.task_type,
            requirement: task.requirement,
            verification_data: task.verification_data,
            is_active: task.is_active,
        });
        setShowTaskModal(true);
    };

    const getTaskTypeName = (type: number) => {
        switch (type) {
            case 1: return "Discord";
            case 2: return "Twitter";
            case 3: return "Transaction";
            case 4: return "Custom";
            default: return "Unknown";
        }
    };

    if (checking) {
        return (
            <div className="admin-page fade-in">
                <div className="loading-state">Checking admin status...</div>
            </div>
        );
    }

    if (!isAdmin) {
        const needsInitialization = !localStorage.getItem("admin_addresses") || 
            JSON.parse(localStorage.getItem("admin_addresses") || "[]").length === 0;
        
        return (
            <div className="admin-page fade-in">
                <div className="unauthorized-state">
                    <h2>{needsInitialization ? "Initialize Contract" : "Unauthorized"}</h2>
                    <p>
                        {needsInitialization 
                            ? "Initialize the contract to become the first admin. This can only be done once."
                            : "You don't have admin permissions. Only admins can access this page."}
                    </p>
                    {needsInitialization && publicKey && (
                        <button 
                            className="btn-primary" 
                            onClick={handleInitialize}
                            disabled={isProcessing}
                            style={{ marginTop: "1rem" }}
                        >
                            {isProcessing ? "Initializing..." : "Initialize Contract"}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page fade-in">
            <h1 className="page-title">Admin Panel</h1>

            <div className="admin-tabs">
                <button 
                    className={`admin-tab ${activeTab === "stamps" ? "active" : ""}`}
                    onClick={() => setActiveTab("stamps")}
                >
                    Stamps
                </button>
                <button 
                    className={`admin-tab ${activeTab === "tasks" ? "active" : ""}`}
                    onClick={() => setActiveTab("tasks")}
                >
                    Tasks
                </button>
                <button 
                    className={`admin-tab ${activeTab === "verifications" ? "active" : ""}`}
                    onClick={() => setActiveTab("verifications")}
                >
                    Verifications {verificationRequests.length > 0 && (
                        <span className="tab-badge">{verificationRequests.length}</span>
                    )}
                </button>
            </div>

            {activeTab === "stamps" && (
                <div className="admin-section">
                    <div className="admin-header">
                        <h2>Stamps Management</h2>
                        <button className="btn-primary" onClick={() => { setEditingStamp(null); resetStampForm(); setShowStampModal(true); }}>
                            + Create Stamp
                        </button>
                    </div>

                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Points</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stamps.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.5)" }}>
                                            No stamps yet. Create your first stamp!
                                        </td>
                                    </tr>
                                ) : (
                                    stamps.map(stamp => (
                                        <tr key={stamp.stamp_id}>
                                            <td>{stamp.stamp_id}</td>
                                            <td>{stamp.name}</td>
                                            <td>{stamp.category}</td>
                                            <td>{stamp.points}</td>
                                            <td>
                                                <span className={`status-badge ${stamp.is_active ? "active" : "inactive"}`}>
                                                    {stamp.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-edit" onClick={() => openEditStamp(stamp)} disabled={isProcessing}>
                                                    Edit
                                                </button>
                                                <button className="btn-delete" onClick={() => handleDeleteStamp(stamp.stamp_id)} disabled={isProcessing}>
                                                    Delete
                                                </button>
                                                <button 
                                                    className="btn-task" 
                                                    onClick={() => { setSelectedStampForTask(stamp.stamp_id); setTaskForm({...taskForm, stamp_id: stamp.stamp_id}); setShowTaskModal(true); }}
                                                    disabled={isProcessing}
                                                >
                                                    + Task
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "tasks" && (
                <div className="admin-section">
                    <div className="admin-header">
                        <h2>Tasks Management</h2>
                        <button className="btn-primary" onClick={() => { setTaskForm({...taskForm, stamp_id: 0}); setShowTaskModal(true); }}>
                            + Create Task
                        </button>
                    </div>

                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Stamp ID</th>
                                    <th>Type</th>
                                    <th>Requirement</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.5)" }}>
                                            No tasks yet. Create your first task!
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.map(task => (
                                        <tr key={task.task_id}>
                                            <td>{task.task_id}</td>
                                            <td>{task.stamp_id}</td>
                                            <td>{getTaskTypeName(task.task_type)}</td>
                                            <td>{task.requirement}</td>
                                            <td>
                                                <span className={`status-badge ${task.is_active ? "active" : "inactive"}`}>
                                                    {task.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-edit" onClick={() => openEditTask(task)} disabled={isProcessing}>
                                                    Edit
                                                </button>
                                                <button className="btn-delete" onClick={() => handleDeleteTask(task.task_id)} disabled={isProcessing}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "verifications" && (
                <div className="admin-section">
                    <div className="admin-header">
                        <h2>Pending Verification Requests ({verificationRequests.length})</h2>
                        <button className="btn-secondary" onClick={() => setShowVerifyModal(true)}>
                            Grant Stamp Manually
                        </button>
                    </div>

                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Request ID</th>
                                    <th>User</th>
                                    <th>Stamp ID</th>
                                    <th>Proof</th>
                                    <th>Requested At</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {verificationRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.5)" }}>
                                            No pending verification requests
                                        </td>
                                    </tr>
                                ) : (
                                    verificationRequests.map(request => {
                                        const stamp = stamps.find(s => s.stamp_id === request.stamp_id);
                                        return (
                                            <tr key={request.request_id}>
                                                <td>{request.request_id}</td>
                                                <td>
                                                    <code style={{ fontSize: "0.85rem", color: "#667eea" }}>
                                                        {formatAddress(request.user, 6, 4)}
                                                    </code>
                                                </td>
                                                <td>
                                                    <span>{request.stamp_id}</span>
                                                    {stamp && <span style={{ marginLeft: "0.5rem", color: "rgba(255,255,255,0.6)" }}>({stamp.name})</span>}
                                                </td>
                                                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {request.proof}
                                                </td>
                                                <td>{new Date(request.requested_at * 1000).toLocaleString()}</td>
                                                <td>
                                                    <button 
                                                        className="btn-task" 
                                                        onClick={() => handleVerifyAndGrant(request)}
                                                        disabled={isProcessing}
                                                    >
                                                        Approve & Grant
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {status && (
                <div className={`status-message ${status.includes("Error") ? "error" : ""}`}>
                    {status}
                </div>
            )}

            {/* Stamp Modal */}
            {showStampModal && (
                <div className="modal-overlay" onClick={() => !isProcessing && setShowStampModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingStamp ? "Edit Stamp" : "Create Stamp"}</h3>
                            <button className="close-button" onClick={() => setShowStampModal(false)} disabled={isProcessing}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={stampForm.name}
                                    onChange={(e) => setStampForm({...stampForm, name: e.target.value})}
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={stampForm.description}
                                    onChange={(e) => setStampForm({...stampForm, description: e.target.value})}
                                    disabled={isProcessing}
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <input
                                    type="text"
                                    value={stampForm.category}
                                    onChange={(e) => setStampForm({...stampForm, category: e.target.value})}
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="form-group">
                                <label>Points</label>
                                <input
                                    type="number"
                                    value={stampForm.points}
                                    onChange={(e) => setStampForm({...stampForm, points: parseInt(e.target.value) || 0})}
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={stampForm.is_active}
                                        onChange={(e) => setStampForm({...stampForm, is_active: e.target.checked})}
                                        disabled={isProcessing}
                                    />
                                    Active
                                </label>
                            </div>
                            <button
                                className="btn-primary full-width"
                                onClick={editingStamp ? handleEditStamp : handleCreateStamp}
                                disabled={isProcessing || !stampForm.name.trim()}
                            >
                                {isProcessing ? "Processing..." : editingStamp ? "Update Stamp" : "Create Stamp"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {showTaskModal && (
                <div className="modal-overlay" onClick={() => !isProcessing && setShowTaskModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingTask ? "Edit Task" : "Create Task"}</h3>
                            <button className="close-button" onClick={() => { setShowTaskModal(false); setEditingTask(null); resetTaskForm(); }} disabled={isProcessing}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Stamp ID</label>
                                <input
                                    type="number"
                                    value={taskForm.stamp_id}
                                    onChange={(e) => setTaskForm({...taskForm, stamp_id: parseInt(e.target.value) || 0})}
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="form-group">
                                <label>Task Type</label>
                                <select
                                    value={taskForm.task_type}
                                    onChange={(e) => setTaskForm({...taskForm, task_type: parseInt(e.target.value)})}
                                    disabled={isProcessing}
                                >
                                    <option value={1}>Discord</option>
                                    <option value={2}>Twitter</option>
                                    <option value={3}>Transaction</option>
                                    <option value={4}>Custom</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Requirement</label>
                                <textarea
                                    value={taskForm.requirement}
                                    onChange={(e) => setTaskForm({...taskForm, requirement: e.target.value})}
                                    disabled={isProcessing}
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Verification Data</label>
                                <textarea
                                    value={taskForm.verification_data}
                                    onChange={(e) => setTaskForm({...taskForm, verification_data: e.target.value})}
                                    disabled={isProcessing}
                                    rows={3}
                                />
                            </div>
                            <button
                                className="btn-primary full-width"
                                onClick={editingTask ? handleEditTask : handleCreateTask}
                                disabled={isProcessing || !taskForm.requirement.trim()}
                            >
                                {isProcessing ? "Processing..." : editingTask ? "Update Task" : "Create Task"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verify Modal */}
            {showVerifyModal && (
                <div className="modal-overlay" onClick={() => !isProcessing && setShowVerifyModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Verify & Grant Stamp</h3>
                            <button className="close-button" onClick={() => setShowVerifyModal(false)} disabled={isProcessing}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>User Address</label>
                                <input
                                    type="text"
                                    value={verifyForm.user}
                                    onChange={(e) => setVerifyForm({...verifyForm, user: e.target.value})}
                                    disabled={isProcessing}
                                    placeholder="aleo1..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Stamp ID</label>
                                <input
                                    type="number"
                                    value={verifyForm.stamp_id}
                                    onChange={(e) => setVerifyForm({...verifyForm, stamp_id: parseInt(e.target.value) || 0})}
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="form-group">
                                <label>Verification Hash</label>
                                <input
                                    type="text"
                                    value={verifyForm.verification_hash}
                                    onChange={(e) => setVerifyForm({...verifyForm, verification_hash: e.target.value})}
                                    disabled={isProcessing}
                                    placeholder="Verification hash"
                                />
                            </div>
                            <button
                                className="btn-primary full-width"
                                onClick={handleVerifyAndGrant}
                                disabled={isProcessing || !verifyForm.user.trim() || !verifyForm.stamp_id}
                            >
                                {isProcessing ? "Processing..." : "Grant Stamp"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

