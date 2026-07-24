/**
 * TaskBoard — Tableau à deux colonnes ("À faire" / "Fait") où les tâches se
 * déplacent au toucher-glisser au lieu d'être cochées.
 *
 * Principes :
 *  - Composant PRÉSENTATIONNEL pur : aucune dépendance au contexte applicatif.
 *    L'état vient des props (`isDone`), les changements remontent via `onMove`.
 *    Le modèle de données n'est PAS modifié : une tâche à droite = completedTasks[id] === true.
 *  - Tactile d'abord : appui long court (150 ms) pour attraper une carte, ce qui
 *    laisse le défilement vertical de la page fonctionner normalement.
 *  - Repli tactile : un simple TAP sur une carte la fait basculer d'une colonne
 *    à l'autre. Le glisser est un plaisir, pas une obligation (motricité fine,
 *    petits doigts, accessibilité).
 *  - Clavier : Espace/Entrée pour attraper, flèches pour déplacer, Espace pour
 *    déposer (KeyboardSensor de dnd-kit).
 *  - `prefers-reduced-motion` respecté : animation de dépôt désactivée.
 */
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { CheckCircle2, GripVertical } from "lucide-react";
import TaskIcon from "@/components/TaskIcon";
import { taskValue } from "@/lib/points";
import type { ID, Task } from "@/lib/types";

const TODO = "todo";
const DONE = "done";
type ColumnId = typeof TODO | typeof DONE;

type TaskBoardProps = {
  /** Tâches assignées à l'enfant, dans l'ordre d'affichage. */
  tasks: Task[];
  /** true si la tâche est déjà faite pour le jour affiché. */
  isDone: (taskId: ID) => boolean;
  /** Appelé UNIQUEMENT quand la colonne change réellement. */
  onMove: (taskId: ID, toDone: boolean) => void;
  /** Désactive toute interaction (ex. consultation d'un jour passé). */
  disabled?: boolean;
  /**
   * "compact" : deux colonnes dans la carte enfant de l'accueil.
   * "large"   : mode focus plein écran (cibles tactiles nettement plus grandes).
   */
  size?: BoardSize;
};

type BoardSize = "compact" | "large";

/** Échelle unique : tout le dimensionnement tactile passe par ici. */
const SCALE = {
  compact: { card: "min-h-[64px] px-2 py-3 gap-2", label: "text-sm", icon: 22, mark: 18, colGap: "gap-2", pad: "p-2", head: "text-xs" },
  large:   { card: "min-h-[96px] px-4 py-5 gap-4", label: "text-xl", icon: 36, mark: 28, colGap: "gap-4", pad: "p-4", head: "text-base" },
} as const;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/* ------------------------------------------------------------------ */
/* Carte de tâche                                                      */
/* ------------------------------------------------------------------ */

const TaskCard = ({
  task,
  done,
  disabled,
  onTap,
  size,
}: {
  task: Task;
  done: boolean;
  disabled?: boolean;
  onTap: () => void;
  size: BoardSize;
}) => {
  const s = SCALE[size];
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { done },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onTap}
      disabled={disabled}
      className={[
        "w-full flex items-center rounded-xl border-2 text-left",
        s.card,
        "select-none transition-colors",
        done
          ? "bg-green-50 border-green-300 text-green-900"
          : "bg-white border-gray-200 text-gray-800 hover:border-purple-300",
        isDragging ? "opacity-30" : "opacity-100",
        disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
      ].join(" ")}
      {...listeners}
      {...attributes}
      aria-label={`${task.name}, ${taskValue(task)} point${taskValue(task) > 1 ? "s" : ""} — ${done ? "fait" : "à faire"}`}
    >
      <TaskIcon iconKey={task.icon} size={s.icon} />
      <span className={`flex-1 font-semibold leading-tight break-words ${s.label}`}>
        {task.name}
      </span>
      {taskValue(task) > 1 && (
        <span
          className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700"
          aria-hidden="true"
        >
          {taskValue(task)}
        </span>
      )}
      {done ? (
        <CheckCircle2 size={s.mark} className="text-green-600 shrink-0" />
      ) : (
        <GripVertical size={s.mark} className="text-gray-300 shrink-0" />
      )}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Colonne (zone de dépôt)                                             */
/* ------------------------------------------------------------------ */

const Column = ({
  id,
  title,
  emoji,
  emptyLabel,
  children,
  count,
  size,
}: {
  id: ColumnId;
  title: string;
  emoji: string;
  emptyLabel: string;
  children: React.ReactNode;
  count: number;
  size: BoardSize;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isDone = id === DONE;
  const s = SCALE[size];

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={[
        "flex-1 min-w-0 rounded-xl border-2 border-dashed transition-colors",
        s.pad,
        isDone ? "bg-green-50/60" : "bg-gray-50",
        isOver
          ? isDone
            ? "border-green-500 bg-green-100"
            : "border-purple-500 bg-purple-50"
          : "border-transparent",
      ].join(" ")}
    >
      <h4
        className={`mb-2 flex items-center gap-1 font-bold uppercase tracking-wide ${s.head} ${
          isDone ? "text-green-700" : "text-gray-500"
        }`}
      >
        <span aria-hidden="true">{emoji}</span>
        {title}
        <span className="ml-auto tabular-nums">{count}</span>
      </h4>

      <div className={size === "large" ? "space-y-4 min-h-[140px]" : "space-y-2 min-h-[72px]"}>
        {count === 0 ? (
          <p className={`px-1 py-4 text-center italic text-gray-400 ${size === "large" ? "text-base" : "text-xs"}`}>
            {emptyLabel}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Tableau                                                             */
/* ------------------------------------------------------------------ */

const TaskBoard = ({ tasks, isDone, onMove, disabled = false, size = "compact" }: TaskBoardProps) => {
  const [activeId, setActiveId] = useState<ID | null>(null);

  const { todo, done } = useMemo(
    () => ({
      todo: tasks.filter((t) => !isDone(t.id)),
      done: tasks.filter((t) => isDone(t.id)),
    }),
    [tasks, isDone],
  );

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  const sensors = useSensors(
    // Souris : petit seuil de déplacement pour ne pas voler les clics.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Tactile : court appui avant de saisir → le scroll de page reste possible.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const t = tasks.find((x) => x.id === active.id);
      return t ? `Tâche ${t.name} attrapée.` : undefined;
    },
    onDragOver: ({ over }) =>
      over ? `Au-dessus de la colonne ${over.id === DONE ? "Fait" : "À faire"}.` : undefined,
    onDragEnd: ({ active, over }) => {
      const t = tasks.find((x) => x.id === active.id);
      if (!t) return undefined;
      if (!over) return `Tâche ${t.name} reposée.`;
      return `Tâche ${t.name} déposée dans ${over.id === DONE ? "Fait" : "À faire"}.`;
    },
    onDragCancel: () => "Déplacement annulé.",
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as ID);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as ID;
    const target: ColumnId = over.id === DONE ? DONE : TODO;
    const wasDone = active.data.current?.done === true;
    const willBeDone = target === DONE;

    // Aucune bascule si la carte retombe dans sa colonne d'origine.
    if (wasDone === willBeDone) return;
    onMove(taskId, willBeDone);
  };

  const dropAnimation: DropAnimation | null = prefersReducedMotion()
    ? null
    : {
        sideEffects: defaultDropAnimationSideEffects({
          styles: { active: { opacity: "0.3" } },
        }),
      };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={`flex ${SCALE[size].colGap}`}>
        <Column
          size={size}
          id={TODO}
          title="À faire"
          emoji="📋"
          emptyLabel="Tout est fait ! 🎉"
          count={todo.length}
        >
          {todo.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              done={false}
              disabled={disabled}
              size={size}
              onTap={() => onMove(task.id, true)}
            />
          ))}
        </Column>

        <Column
          size={size}
          id={DONE}
          title="Fait"
          emoji="✅"
          emptyLabel="Glisse une tâche ici 👉"
          count={done.length}
        >
          {done.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              done
              disabled={disabled}
              size={size}
              onTap={() => onMove(task.id, false)}
            />
          ))}
        </Column>
      </div>

      {/* Carte fantôme suivant le doigt : évite tout rognage par les overflow. */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div
            className={`flex items-center rounded-xl border-2 border-purple-400 bg-white shadow-2xl rotate-2 ${SCALE[size].card}`}
          >
            <TaskIcon iconKey={activeTask.icon} size={SCALE[size].icon} />
            <span className={`flex-1 font-semibold leading-tight text-gray-800 ${SCALE[size].label}`}>
              {activeTask.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
