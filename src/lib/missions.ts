// Mission definitions for the Kubernetes cluster rescue game
// Each mission represents a real-world K8s issue to diagnose and fix.

export type MissionStatus = "locked" | "available" | "inProgress" | "completed";

// A narrower type returned by getMissionStatus / statusOf — "inProgress"
// is only set transiently by the store and never returned by these helpers.
export type BeaconStatus = "locked" | "available" | "completed";

export type ChallengeType = "command_choice" | "yaml_fix" | "multi_choice";

export interface Challenge {
  type: ChallengeType;
  prompt: string;
  context?: string; // e.g., the broken YAML or kubectl output snippet
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Mission {
  id: string;
  title: string;
  codename: string; // short codename used on the beacon
  brief: string; // narrative brief shown in the dialogue
  scenario: string; // technical description of what is wrong
  position: [number, number]; // [x, z] on the cluster floor
  color: string; // accent color for the beacon
  icon: string; // lucide icon name (we map a small subset)
  prerequisites: string[]; // mission ids that must be completed first
  rewardXp: number;
  challenge: Challenge;
}

export const MISSIONS: Mission[] = [
  {
    id: "crashloop",
    title: "CrashLoopBackOff",
    codename: "POD-CTL",
    brief:
      "The 'payments-api' pod in the checkout namespace keeps restarting in a CrashLoopBackOff. Logs show the container exits with code 1 seconds after start. The team suspects a misconfigured startup command. Diagnose and recover the pod.",
    scenario:
      "kubectl logs payments-api-7c4f9 -n checkout returns: 'env: NODE_ENV: No such file or directory'. The container's startup command is hardcoded and references a variable that was never set.",
    position: [-9, -6],
    color: "#f97316",
    icon: "alert-octagon",
    prerequisites: [],
    rewardXp: 100,
    challenge: {
      type: "command_choice",
      prompt:
        "Which kubectl command should you run to override the pod's startup command with the correct entrypoint?",
      context:
        "Current command: ['sh','-c','node server.js --env=$NODE_ENV']\nImage: payments-api:v2.3 (entrypoint exists)",
      options: [
        "kubectl set image deployment/payments-api app=payments-api:v2.3 -n checkout",
        "kubectl patch deployment payments-api -n checkout --type=json -p='[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/command\",\"value\":[\"node\",\"server.js\",\"--env=production\"]}]'",
        "kubectl delete pod -l app=payments-api -n checkout",
        "kubectl scale deployment payments-api --replicas=0 -n checkout",
      ],
      correctIndex: 1,
      explanation:
        "A strategic JSON patch that replaces only the broken command keeps the existing image and rollout history, then triggers a rolling restart with the corrected entrypoint.",
    },
  },
  {
    id: "createcontainerconfig",
    title: "CreateContainerConfigError",
    codename: "CFG-MISS",
    brief:
      "The 'checkout-frontend' pod won't even start. kubectl get pods shows a state you've never seen before — not CrashLoopBackOff, not Pending, not ImagePullBackOff. The deployment pipeline succeeded, the image exists, the registry is fine — but the kubelet refuses to create the container.",
    scenario:
      "kubectl describe pod checkout-frontend-7d4f2 -n checkout shows: 'Containers: checkout-frontend, State: Waiting, Reason: CreateContainerConfigError, Message: cannot find key DB_HOST in ConfigMap checkout-config'. The team renamed the ConfigMap key from DB_HOST to DATABASE_URL last release — and updated the app to read DATABASE_URL — but the deployment manifest wasn't in the same PR.",
    position: [-18, -2],
    color: "#ec4899",
    icon: "file-question",
    prerequisites: ["crashloop"],
    rewardXp: 130,
    challenge: {
      type: "yaml_fix",
      prompt: "Pick the corrected env block that gets the pod scheduled.",
      context:
        "ConfigMap 'checkout-config' now contains: DATABASE_URL, CHECKOUT_REGION, API_TIMEOUT\nApp code reads from env var 'DATABASE_URL' (was 'DB_HOST' before the rename)\nCurrent broken env block:\nenv:\n  - name: DB_HOST\n    valueFrom:\n      configMapKeyRef:\n        name: checkout-config\n        key: DB_HOST",
      options: [
        "env:\n  - name: DATABASE_URL\n    valueFrom:\n      configMapKeyRef:\n        name: checkout-config\n        key: DATABASE_URL",
        "env:\n  - name: DB_HOST\n    value: 'localhost:5432'",
        "env:\n  - name: DB_HOST\n    valueFrom:\n      configMapKeyRef:\n        name: checkout-config\n        key: DATABASE_URL",
        "env:\n  - name: DATABASE_URL\n    valueFrom:\n      secretKeyRef:\n        name: checkout-config\n        key: DATABASE_URL",
      ],
      correctIndex: 0,
      explanation:
        "CreateContainerConfigError fires before the container starts because the kubelet can't resolve the env var reference. Both the env var name (the app reads DATABASE_URL now) and the ConfigMap key (renamed to DATABASE_URL) need to point at DATABASE_URL. Option C is the seductive one — it would technically schedule the pod because the kubelet can find the ConfigMap key — but the app would still crash at runtime looking for env var DATABASE_URL while only DB_HOST is set. Option D fails for a different reason: ConfigMaps and Secrets are different Kubernetes types, so a secretKeyRef pointing at a ConfigMap name throws the same CreateContainerConfigError. The Friday deploy that renamed the key without updating the deployment manifest is the real culprit — same pattern as the cost optimization sweep, different villain.",
    },
  },
  {
    id: "initcontainerhang",
    title: "Init Container Hang",
    codename: "INIT-WAIT",
    brief:
      "The 'payments-worker' pod has been stuck in Init:0/1 for forty minutes. The init container is supposed to wait for the database to come up, then hand off to the main container. The database is up. The init container doesn't know that.",
    scenario:
      "kubectl describe pod payments-worker -n checkout shows: 'Init Containers: wait-for-db, State: Running, Restart Count: 0'. kubectl logs payments-worker -c wait-for-db -n checkout loops: 'nslookup pg-primary: Server can't find pg-primary: NXDOMAIN'. The actual database Service is named 'postgres' in the 'data' namespace — not 'pg-primary' in 'checkout'.",
    position: [-3, -12],
    color: "#0ea5e9",
    icon: "hourglass",
    prerequisites: ["crashloop"],
    rewardXp: 140,
    challenge: {
      type: "yaml_fix",
      prompt:
        "Pick the corrected init container command that actually waits for the database — not for a service that doesn't exist.",
      context:
        "Database Service: 'postgres' in namespace 'data'\nPod namespace: 'checkout'\nCurrent broken init container:\ncommand: ['sh', '-c', 'until nslookup pg-primary; do echo waiting; sleep 2; done']",
      options: [
        "command: ['sh', '-c', 'until nslookup postgres.data.svc.cluster.local; do echo waiting; sleep 2; done']",
        "command: ['sh', '-c', 'until nslookup pg-primary; do echo waiting; sleep 2; done']",
        "command: ['sh', '-c', 'sleep 5']",
        "command: ['sh', '-c', 'until nslookup postgres; do echo waiting; sleep 2; done']",
      ],
      correctIndex: 0,
      explanation:
        "Service DNS is namespace-scoped: 'postgres' alone only resolves in the 'data' namespace where it lives. From the checkout namespace you need the FQDN 'postgres.data.svc.cluster.local'. Option D would still fail in checkout because there's no 'postgres' service in that namespace — same NXDOMAIN, just a different wrong name. Hardcoding 'sleep 5' (option C) is the worst kind of fix: it would proceed even if the database were genuinely down, turning a controlled wait into a cascade of main-container failures. The Friday deploy that renamed the service 'for consistency' without updating the init container is the same pattern as the cost optimization sweep — well-meaning refactor, broken downstream.",
    },
  },
  {
    id: "imagepull",
    title: "ImagePullBackOff",
    codename: "IMG-REG",
    brief:
      "The 'inventory-svc' pod in the warehouse namespace is stuck in ImagePullBackOff. The registry path looks right but the team rotated credentials last week. Restore the workload.",
    scenario:
      "kubectl describe pod inventory-svc -n warehouse shows: 'Failed to pull image \"registry.internal/warehouse/inventory-svc:v1.8\": rpc error: code = Unknown desc = unauthorized: authentication required'.",
    position: [9, -6],
    color: "#06b6d4",
    icon: "package",
    prerequisites: [],
    rewardXp: 120,
    challenge: {
      type: "multi_choice",
      prompt:
        "What is the safest way to refresh the registry credentials without redeploying every image?",
      context: "Secret: regcred (type: kubernetes.io/dockerconfigjson)",
      options: [
        "Delete and recreate the deployment with a fresh image tag",
        "Patch the existing regcred secret with the new dockerconfigjson, then restart affected pods",
        "Add imagePullPolicy: Never to every deployment",
        "Switch the cluster to a public registry without auth",
      ],
      correctIndex: 1,
      explanation:
        "Updating the image-pull secret in place and bouncing only the affected pods preserves your rollout history and avoids unnecessary registry traffic.",
    },
  },
  {
    id: "oomkilled",
    title: "OOMKilled",
    codename: "MEM-137",
    brief:
      "The 'reports-worker' pod in the analytics namespace keeps dying mid-job and restarting. No crash logs, no stack trace — the container just vanishes. The on-call swears the node is haunted. You know better.",
    scenario:
      "kubectl describe pod reports-worker -n analytics shows: 'Last State: Terminated, Reason: OOMKilled, Exit Code: 137'. The container's memory limit is 128Mi; the report generator peaks near 300Mi on large datasets.",
    position: [-9, -12],
    color: "#ef4444",
    icon: "memory-stick",
    prerequisites: [],
    rewardXp: 110,
    challenge: {
      type: "yaml_fix",
      prompt:
        "Pick the container resources block that stops the kills without endangering the node.",
      context:
        "Current:\nresources:\n  limits:\n    memory: 128Mi\nObserved peak usage: ~300Mi per job",
      options: [
        "resources:\n  requests:\n    memory: 256Mi\n  limits:\n    memory: 512Mi",
        "resources: {}",
        "resources:\n  limits:\n    cpu: \"2\"\n    memory: 128Mi",
        "restartPolicy: Never",
      ],
      correctIndex: 0,
      explanation:
        "Exit 137 means the kernel's OOM killer sent SIGKILL at the cgroup limit. Right-sizing requests AND limits fixes it properly: the request guarantees the scheduler puts the pod on a node that actually has the memory. Removing limits entirely also 'fixes' it — but just moves the bomb to the node, where the kubelet evicts pods unpredictably under pressure.",
    },
  },
  {
    id: "nodepressure",
    title: "Node DiskPressure",
    codename: "NODE-DISK",
    brief:
      "Worker node 'worker-03' is reporting DiskPressure and is no longer scheduling pods. Old crashed container logs are filling /var. Stabilize the node.",
    scenario:
      "kubectl describe node worker-03 shows: 'kubelet has disk pressure: true'. df -h inside the node shows /var at 97%. The kubelet eviction threshold is the default 10%.",
    position: [-12, 8],
    color: "#f59e0b",
    icon: "hard-drive",
    prerequisites: ["crashloop"],
    rewardXp: 150,
    challenge: {
      type: "command_choice",
      prompt:
        "Pick the command that frees kubelet-managed garbage without nuking running workloads on the node.",
      context: "Default Kubelet flags: --maximum-dead-containers=0, image-gc-high-threshold=85%",
      options: [
        "ssh worker-03 && rm -rf /var/lib/docker/containers/*",
        "kubectl drain worker-03 --ignore-daemonsets --delete-emptydir-data && crictl rmi --prune && kubectl uncordon worker-03",
        "kubectl delete node worker-03 and re-add it",
        "systemctl restart kubelet on worker-03",
      ],
      correctIndex: 1,
      explanation:
        "Draining safely evicts pods, prune removes unreferenced images, and uncordon brings the node back to Ready. This clears DiskPressure without losing node identity. Bonus: those dead containers were leftovers from the same 'cost optimization sweep' that later scaled down CoreDNS — a single bad initiative, two incidents.",
    },
  },
  {
    id: "pdbstuck",
    title: "The Drain That Wouldn't",
    codename: "DRAIN-HANG",
    brief:
      "worker-03 is patched and healthy — but now worker-05 needs a kernel update tonight, and the drain has been 'evicting pods' for twenty minutes. The maintenance window is closing fast.",
    scenario:
      "kubectl drain worker-05 --ignore-daemonsets hangs on checkout pods with: 'Cannot evict pod as it would violate the pod's disruption budget'. kubectl get pdb -n checkout shows 4/4 healthy, ALLOWED DISRUPTIONS 0 — the PDB was set to maxUnavailable: 0 to 'keep checkout safe'.",
    position: [-16, 2],
    color: "#8b5cf6",
    icon: "lock",
    prerequisites: ["nodepressure"],
    rewardXp: 180,
    challenge: {
      type: "command_choice",
      prompt:
        "How do you unblock the drain without defeating the PDB's intent of keeping checkout online?",
      context:
        "PDB: checkout-pdb, maxUnavailable: 0\nDeployment: 4 replicas across 5 nodes\nMaintenance window: 45 minutes remaining",
      options: [
        "kubectl drain worker-05 --ignore-daemonsets --disable-eviction",
        "kubectl patch pdb checkout-pdb -n checkout --type merge -p '{\"spec\":{\"maxUnavailable\":1}}' && kubectl drain worker-05 --ignore-daemonsets && kubectl patch pdb checkout-pdb -n checkout --type merge -p '{\"spec\":{\"maxUnavailable\":0}}'",
        "kubectl delete pods -n checkout --field-selector spec.nodeName=worker-05",
        "Reboot worker-05 so the pods move on their own",
      ],
      correctIndex: 1,
      explanation:
        "ALLOWED DISRUPTIONS 0 means the eviction API itself refuses — and --disable-eviction or direct deletion bypasses that safety entirely, risking all four replicas at once. Temporarily allowing one disruption lets the scheduler relocate a single pod (3/4 stay available), and restoring the PDB after the window keeps the guardrail in place.",
    },
  },
  {
    id: "pvcpending",
    title: "PVC Pending",
    codename: "PV-WAIT",
    brief:
      "A StatefulSet 'events-db' in the data namespace has a PVC stuck in Pending for ten minutes. The storage class exists but no PV matches. Resolve the binding.",
    scenario:
      "kubectl get pvc -n data shows events-db-pvc Pending. Storage class 'fast-ssd' has WaitForFirstConsumer binding but the SC is empty: kubectl get sc fast-ssd returns 'No resources found'.",
    position: [12, 8],
    color: "#a855f7",
    icon: "database",
    prerequisites: ["imagepull"],
    rewardXp: 150,
    challenge: {
      type: "command_choice",
      prompt:
        "Which command restores the missing storage class with WaitForFirstConsumer binding?",
      context:
        "Provisioner: pd.csi.storage.gke.io\nReclaimPolicy: Delete\nVolumeBindingMode: WaitForFirstConsumer",
      options: [
        "kubectl apply -f - <<EOF\napiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata:\n  name: fast-ssd\nprovisioner: pd.csi.storage.gke.io\nreclaimPolicy: Delete\nvolumeBindingMode: WaitForFirstConsumer\nEOF",
        "kubectl edit pvc events-db-pvc -n data and add a storageClassName",
        "kubectl delete pvc events-db-pvc -n data and let the StatefulSet recreate it",
        "Restart the CSI controller pods in kube-system",
      ],
      correctIndex: 0,
      explanation:
        "Recreating the StorageClass with WaitForFirstConsumer lets the PVC bind as soon as the StatefulSet's pod is scheduled — exactly the original intent.",
    },
  },
  {
    id: "svcendpoints",
    title: "Empty Service Endpoints",
    codename: "EP-EMPTY",
    brief:
      "The 'search-api' Service in the discovery namespace has zero endpoints. The pods are Ready and healthy, yet the service is unreachable. Find the misconfiguration.",
    scenario:
      "kubectl get endpoints search-api -n discovery returns empty. Pods are labeled app=search-api, tier=frontend. The Service selector is app=search, role=api.",
    position: [0, 14],
    color: "#22c55e",
    icon: "network",
    prerequisites: ["nodepressure", "pvcpending"],
    rewardXp: 200,
    challenge: {
      type: "yaml_fix",
      prompt: "Pick the corrected Service manifest that will bind the pods as endpoints.",
      context:
        "Pods labels: app=search-api, tier=frontend\nCurrent broken service:\napiVersion: v1\nkind: Service\nmetadata:\n  name: search-api\n  namespace: discovery\nspec:\n  selector:\n    app: search\n    role: api\n  ports:\n    - port: 80\n      targetPort: 8080",
      options: [
        "spec:\n  selector:\n    app: search-api\n    tier: frontend\n  ports:\n    - port: 80\n      targetPort: 8080",
        "spec:\n  type: LoadBalancer\n  selector:\n    app: search\n  ports:\n    - port: 80\n      targetPort: 8080",
        "spec:\n  selector: {}\n  ports:\n    - port: 80\n      targetPort: 8080",
        "spec:\n  selector:\n    app: search-api\n    tier: backend\n  ports:\n    - port: 8080\n      targetPort: 80",
      ],
      correctIndex: 0,
      explanation:
        "The selector must match the pod labels exactly. Updating selector to app=search-api, tier=frontend rebinds the pods as live endpoints with no downtime.",
    },
  },
  {
    id: "dnsblackout",
    title: "Cluster DNS Blackout",
    codename: "DNS-BLK",
    brief:
      "Every service-to-service call in the cluster just started failing with 'name resolution failed'. Pods are Running, endpoints are populated — but nobody can find anybody. The whole cluster has gone deaf.",
    scenario:
      "From a debug pod, nslookup kubernetes.default times out — no DNS server responds. Apps fail with 'dial tcp: lookup checkout.svc.cluster.local: no such host'. Everything in the workload namespaces looks healthy.",
    position: [0, 20],
    color: "#10b981",
    icon: "wifi-off",
    prerequisites: ["svcendpoints"],
    rewardXp: 200,
    challenge: {
      type: "command_choice",
      prompt:
        "Which command cleanly isolates whether the problem is cluster DNS itself, rather than one misbehaving app?",
      context:
        "Symptom is cluster-wide, but you want proof before touching kube-system\nSuspected blast radius: all namespaces",
      options: [
        "kubectl run dnscheck --rm -it --restart=Never --image=busybox -- nslookup kubernetes.default",
        "kubectl logs deployment/coredns -n kube-system --tail=100",
        "kubectl exec -it search-api-6f2d1 -n discovery -- curl localhost:8080/healthz",
        "ping 10.96.0.10",
      ],
      correctIndex: 0,
      explanation:
        "kubernetes.default is only resolvable through cluster DNS — resolving it from a throwaway pod proves or rules out the DNS layer in one shot, with zero dependence on any app's config. When it fails, check kube-system next: you'll find the coredns deployment scaled to zero (a leftover from yesterday's 'cost cleanup' initiative — the same one that left the dead containers on worker-03). kubectl scale deployment coredns -n kube-system --replicas=2 restores hearing to the cluster.",
    },
  },
  {
    id: "x509cert",
    title: "x509: Certificate Expired",
    codename: "CERT-EXP",
    brief:
      "It's 02:14 and kubectl just started returning 'Unauthorized' on every command. The on-call has access, the kubeconfig is valid, the cluster API was healthy an hour ago. The cert fairy has come for her monthly visit — and the 'cost optimization' team forgot to renew.",
    scenario:
      "kubectl get nodes returns: 'error: You must be logged in to the server (Unauthorized)'. kubectl version shows client v1.29.4. The kubeconfig's client-certificate-data decodes to a cert with Not After: yesterday at 23:59 UTC. The cluster is kubeadm-bootstrapped. You're SSHd into a control-plane node.",
    position: [0, -16],
    color: "#dc2626",
    icon: "shield-alert",
    prerequisites: ["pdbstuck", "dnsblackout"],
    rewardXp: 250,
    challenge: {
      type: "multi_choice",
      prompt:
        "kubectl is locked out — the very tool you'd use to fix things. What's the move?",
      context:
        "kubeadm cluster, v1.29.4\nClient cert expired at midnight UTC\nAPI server is still running, just refusing your cert\nYou're SSHd into a control-plane node (k8s-cp-01)",
      options: [
        "On the control-plane node: sudo kubeadm certs renew all && sudo systemctl restart kube-apiserver kube-controller-manager kube-scheduler etcd",
        "On the control-plane node: sudo rm /etc/kubernetes/pki/ca.crt && sudo kubeadm init phase certs ca",
        "From your laptop: kubeadm certs renew admin.conf && kubectl --kubeconfig=/etc/kubernetes/admin.conf get nodes",
        "Generate a new admin cert manually with openssl req -new -x509 -key admin.key -out admin.crt -days 365 and copy it into ~/.kube/config",
      ],
      correctIndex: 0,
      explanation:
        "When the client cert is expired, kubectl can't talk to the API at all — so the fix has to happen on the control-plane node itself, not through kubectl. `kubeadm certs renew all` regenerates every expiring cert in /etc/kubernetes/pki (apiserver, etcd, controller-manager, scheduler, and the admin.conf client cert). Restarting those four control-plane components picks up the new certs with near-zero downtime because etcd and the API server are stateless processes. Reinitializing the CA from scratch would invalidate every client cert in the cluster — including all the kubelets — turning a 30-second fix into a multi-hour outage. The 'cost optimization' team that skipped the renewal calendar? Send them the bill.",
    },
  },
  {
    id: "clusterrestored",
    title: "Cluster Heartbeat Restored",
    codename: "CORE-HEAL",
    brief:
      "With all subsystems recovered and the cert renewed, the cluster control plane reports green. The SRE on call has asked you to verify cluster health and close the incident — the one started by the cost optimization sweep.",
    scenario:
      "All nodes Ready. All pods Running. CoreDNS responding. Certs fresh. The only remaining step: confirm the control plane is healthy and close the incident.",
    position: [0, 0],
    color: "#fbbf24",
    icon: "shield-check",
    prerequisites: ["x509cert"],
    rewardXp: 300,
    challenge: {
      type: "command_choice",
      prompt:
        "Which command gives a one-shot health view of the control-plane components?",
      context: "Cluster: kubeadm-bootstrapped, v1.29.4",
      options: [
        "kubectl get pods -n kube-system",
        "kubectl cluster-info dump",
        "kubectl get --raw='/readyz?verbose=true'",
        "kubectl describe nodes | grep -i taint",
      ],
      correctIndex: 2,
      explanation:
        "The /readyz?verbose=true endpoint returns the granular health of each control-plane module (etcd, scheduler, controller-manager, apiserver). A 200 OK means the control plane is healthy — and you can finally close the incident the cost optimization sweep opened. Next month, set a calendar reminder for cert renewal.",
    },
  },
];

export const STORAGE_KEY = "kube-rescue-save-v1";

export interface GameSave {
  playerName: string;
  completedMissions: string[];
  currentMission: string | null;
  totalXp: number;
  lastUpdated: number;
}

export const defaultSave = (): GameSave => ({
  playerName: "",
  completedMissions: [],
  currentMission: null,
  totalXp: 0,
  lastUpdated: Date.now(),
});

export function loadSave(): GameSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSave;
    return { ...defaultSave(), ...parsed };
  } catch {
    return null;
  }
}

export function persistSave(save: GameSave): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getMissionStatus(
  missionId: string,
  completed: string[]
): BeaconStatus {
  if (completed.includes(missionId)) return "completed";
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return "locked";
  const hasAllPrereqs = mission.prerequisites.every((p) =>
    completed.includes(p)
  );
  return hasAllPrereqs ? "available" : "locked";
}
