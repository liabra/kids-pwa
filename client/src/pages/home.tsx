  import React, { useState, useEffect } from 'react';
  import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Calendar, Trophy, Flame, Sparkles, Star, Frown, Cloud, Zap, History, TrendingUp } from 'lucide-react';

  const KidsTasksApp = () => {
    // États principaux
    const [children, setChildren] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [dailyRewards, setDailyRewards] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [weeklyRewards, setWeeklyRewards] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [dailyData, setDailyData] = useState({});

    // États pour les modales
    const [showAddChild, setShowAddChild] = useState(false);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showAddDailyReward, setShowAddDailyReward] = useState(false);
    const [showAddChallenge, setShowAddChallenge] = useState(false);
    const [showAddWeeklyReward, setShowAddWeeklyReward] = useState(false);
    const [showManageTasks, setShowManageTasks] = useState(null);
    const [showHistory, setShowHistory] = useState(null);
    const [showWeeklySummary, setShowWeeklySummary] = useState(false);

    // États pour les formulaires
    const [newChildName, setNewChildName] = useState('');
    const [newChildColor, setNewChildColor] = useState('#FF6B6B');
    const [newTaskName, setNewTaskName] = useState('');
    const [newRewardName, setNewRewardName] = useState('');
    const [newRewardPoints, setNewRewardPoints] = useState(5);
    const [newChallengeName, setNewChallengeName] = useState('');
    const [newChallengePoints, setNewChallengePoints] = useState(2);
    const [newWeeklyRewardName, setNewWeeklyRewardName] = useState('');
    const [newWeeklyRewardPoints, setNewWeeklyRewardPoints] = useState(20);

    // Couleurs prédéfinies
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

    // Chargement des données
    useEffect(() => {
      const savedChildren = localStorage.getItem('children');
      const savedTasks = localStorage.getItem('tasks');
      const savedDailyRewards = localStorage.getItem('dailyRewards');
      const savedChallenges = localStorage.getItem('challenges');
      const savedWeeklyRewards = localStorage.getItem('weeklyRewards');
      const savedDailyData = localStorage.getItem('dailyData');

      if (savedChildren) setChildren(JSON.parse(savedChildren));
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedDailyRewards) setDailyRewards(JSON.parse(savedDailyRewards));
      if (savedChallenges) setChallenges(JSON.parse(savedChallenges));
      if (savedWeeklyRewards) setWeeklyRewards(JSON.parse(savedWeeklyRewards));
      if (savedDailyData) setDailyData(JSON.parse(savedDailyData));
    }, []);

    // Sauvegarde automatique
    useEffect(() => {
      localStorage.setItem('children', JSON.stringify(children));
    }, [children]);

    useEffect(() => {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
      localStorage.setItem('dailyRewards', JSON.stringify(dailyRewards));
    }, [dailyRewards]);

    useEffect(() => {
      localStorage.setItem('challenges', JSON.stringify(challenges));
    }, [challenges]);

    useEffect(() => {
      localStorage.setItem('weeklyRewards', JSON.stringify(weeklyRewards));
    }, [weeklyRewards]);

    useEffect(() => {
      localStorage.setItem('dailyData', JSON.stringify(dailyData));
    }, [dailyData]);

    // Utilitaires de date
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    const getDayName = (date) => {
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return days[date.getDay()];
    };

    const getWeekStart = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };

    const getWeekDates = (date) => {
      const weekStart = getWeekStart(date);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        dates.push(d);
      }
      return dates;
    };

    // Navigation temporelle
    const goToPreviousDay = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    };

    const goToNextDay = () => {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    };

    const goToToday = () => {
      setCurrentDate(new Date());
    };

    const isToday = () => {
      const today = new Date();
      return formatDate(currentDate) === formatDate(today);
    };

    // Gestion des enfants
    const addChild = () => {
      if (newChildName.trim()) {
        const newChild = {
          id: Date.now(),
          name: newChildName,
          color: newChildColor,
          assignedTasks: []
        };
        setChildren([...children, newChild]);
        setNewChildName('');
        setShowAddChild(false);
      }
    };

    const removeChild = (id) => {
      if (confirm('Voulez-vous vraiment supprimer cet enfant ?')) {
        setChildren(children.filter(c => c.id !== id));
      }
    };

    // Gestion des tâches
    const addTask = () => {
      if (newTaskName.trim()) {
        const newTask = {
          id: Date.now(),
          name: newTaskName
        };
        setTasks([...tasks, newTask]);
        setNewTaskName('');
        setShowAddTask(false);
      }
    };

    const removeTask = (id) => {
      if (confirm('Voulez-vous vraiment supprimer cette tâche ?')) {
        setTasks(tasks.filter(t => t.id !== id));
        // Retirer la tâche des enfants
        setChildren(children.map(child => ({
          ...child,
          assignedTasks: child.assignedTasks.filter(tid => tid !== id)
        })));
      }
    };

    const toggleTaskAssignment = (childId, taskId) => {
      setChildren(children.map(child => {
        if (child.id === childId) {
          const isAssigned = child.assignedTasks.includes(taskId);
          return {
            ...child,
            assignedTasks: isAssigned 
              ? child.assignedTasks.filter(tid => tid !== taskId)
              : [...child.assignedTasks, taskId]
          };
        }
        return child;
      }));
    };

    // Gestion des tâches complétées
    const toggleTaskCompletion = (childId, taskId) => {
      const dateKey = formatDate(currentDate);
      const newDailyData = { ...dailyData };

      if (!newDailyData[dateKey]) {
        newDailyData[dateKey] = {};
      }
      if (!newDailyData[dateKey][childId]) {
        newDailyData[dateKey][childId] = { completedTasks: {}, activeChallenges: {}, claimedWeeklyRewards: [] };
      }

      const isCompleted = newDailyData[dateKey][childId].completedTasks[taskId];
      newDailyData[dateKey][childId].completedTasks[taskId] = !isCompleted;

      setDailyData(newDailyData);
    };

    const isTaskCompleted = (childId, taskId) => {
      const dateKey = formatDate(currentDate);
      return dailyData[dateKey]?.[childId]?.completedTasks[taskId] || false;
    };

    // Gestion des défis
    const addChallenge = () => {
      if (newChallengeName.trim()) {
        const newChallenge = {
          id: Date.now(),
          name: newChallengeName,
          pointsLost: newChallengePoints
        };
        setChallenges([...challenges, newChallenge]);
        setNewChallengeName('');
        setNewChallengePoints(2);
        setShowAddChallenge(false);
      }
    };

    const removeChallenge = (id) => {
      if (confirm('Voulez-vous vraiment supprimer ce défi ?')) {
        setChallenges(challenges.filter(c => c.id !== id));
      }
    };

    const activateChallenge = (childId, challengeId) => {
      const dateKey = formatDate(currentDate);
      const newDailyData = { ...dailyData };

      if (!newDailyData[dateKey]) {
        newDailyData[dateKey] = {};
      }
      if (!newDailyData[dateKey][childId]) {
        newDailyData[dateKey][childId] = { completedTasks: {}, activeChallenges: {}, claimedWeeklyRewards: [] };
      }

      newDailyData[dateKey][childId].activeChallenges[challengeId] = 'active';
      setDailyData(newDailyData);
    };

    const resolveChallenge = (childId, challengeId, success) => {
      const dateKey = formatDate(currentDate);
      const newDailyData = { ...dailyData };

      if (success) {
        newDailyData[dateKey][childId].activeChallenges[challengeId] = 'success';
      } else {
        newDailyData[dateKey][childId].activeChallenges[challengeId] = 'failed';
      }

      setDailyData(newDailyData);
    };

    const getActiveChallenges = (childId) => {
      const dateKey = formatDate(currentDate);
      const childData = dailyData[dateKey]?.[childId];
      if (!childData) return [];

      return Object.entries(childData.activeChallenges || {})
        .filter(([_, status]) => status === 'active')
        .map(([challengeId]) => challenges.find(c => c.id === parseInt(challengeId)))
        .filter(c => c);
    };

    // Calcul des points
    const getDailyPoints = (childId, date) => {
      const dateKey = formatDate(date);
      const childData = dailyData[dateKey]?.[childId];
      if (!childData) return 0;

      let points = 0;

      // Points des tâches complétées
      Object.entries(childData.completedTasks || {}).forEach(([_, completed]) => {
        if (completed) points += 1;
      });

      // Points des défis
      Object.entries(childData.activeChallenges || {}).forEach(([challengeId, status]) => {
        if (status === 'success') {
          points += 1; // Bonus
        } else if (status === 'failed') {
          const challenge = challenges.find(c => c.id === parseInt(challengeId));
          if (challenge) {
            points -= challenge.pointsLost;
          }
        }
      });

      return points;
    };

    const getWeeklyPoints = (childId) => {
      const weekDates = getWeekDates(currentDate);
      let total = 0;
      weekDates.forEach(date => {
        total += getDailyPoints(childId, date);
      });
      return total;
    };

    // Paliers visuels
    const getTierInfo = (points) => {
      if (points >= 15) {
        return { icon: Flame, color: 'text-orange-500', label: 'En feu!', animation: 'animate-pulse' };
      } else if (points >= 10) {
        return { icon: Sparkles, color: 'text-purple-500', label: 'Brillant!', animation: 'animate-bounce' };
      } else if (points >= 5) {
        return { icon: Star, color: 'text-yellow-500', label: 'Super!', animation: '' };
      } else if (points > 0) {
        return { icon: Star, color: 'text-blue-400', label: '', animation: '' };
      } else if (points === 0) {
        return { icon: Star, color: 'text-gray-400', label: '', animation: '' };
      } else if (points > -5) {
        return { icon: Frown, color: 'text-red-400', label: 'Attention', animation: '' };
      } else if (points > -10) {
        return { icon: Cloud, color: 'text-gray-500', label: 'Difficile', animation: '' };
      } else {
        return { icon: Zap, color: 'text-red-600', label: 'Crise!', animation: 'animate-pulse' };
      }
    };

    // Récompenses quotidiennes
    const addDailyReward = () => {
      if (newRewardName.trim()) {
        const newReward = {
          id: Date.now(),
          name: newRewardName,
          points: newRewardPoints
        };
        setDailyRewards([...dailyRewards, newReward]);
        setNewRewardName('');
        setNewRewardPoints(5);
        setShowAddDailyReward(false);
      }
    };

    const removeDailyReward = (id) => {
      if (confirm('Voulez-vous vraiment supprimer cette récompense ?')) {
        setDailyRewards(dailyRewards.filter(r => r.id !== id));
      }
    };

    // Récompenses hebdomadaires
    const addWeeklyReward = () => {
      if (newWeeklyRewardName.trim()) {
        const newReward = {
          id: Date.now(),
          name: newWeeklyRewardName,
          points: newWeeklyRewardPoints
        };
        setWeeklyRewards([...weeklyRewards, newReward]);
        setNewWeeklyRewardName('');
        setNewWeeklyRewardPoints(20);
        setShowAddWeeklyReward(false);
      }
    };

    const removeWeeklyReward = (id) => {
      if (confirm('Voulez-vous vraiment supprimer cette récompense ?')) {
        setWeeklyRewards(weeklyRewards.filter(r => r.id !== id));
      }
    };

    const toggleWeeklyReward = (childId, rewardId) => {
      const weekStart = getWeekStart(currentDate);
      const weekKey = formatDate(weekStart);
      const newDailyData = { ...dailyData };

      if (!newDailyData[weekKey]) {
        newDailyData[weekKey] = {};
      }
      if (!newDailyData[weekKey][childId]) {
        newDailyData[weekKey][childId] = { completedTasks: {}, activeChallenges: {}, claimedWeeklyRewards: [] };
      }

      const claimed = newDailyData[weekKey][childId].claimedWeeklyRewards || [];
      if (claimed.includes(rewardId)) {
        newDailyData[weekKey][childId].claimedWeeklyRewards = claimed.filter(id => id !== rewardId);
      } else {
        newDailyData[weekKey][childId].claimedWeeklyRewards = [...claimed, rewardId];
      }

      setDailyData(newDailyData);
    };

    const isWeeklyRewardClaimed = (childId, rewardId) => {
      const weekStart = getWeekStart(currentDate);
      const weekKey = formatDate(weekStart);
      const claimed = dailyData[weekKey]?.[childId]?.claimedWeeklyRewards || [];
      return claimed.includes(rewardId);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
        <div className="max-w-7xl mx-auto">
          {/* En-tête */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-8 drop-shadow-lg">
            ⭐ Tableau des Champions ⭐
          </h1>

          {/* Navigation temporelle */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={goToPreviousDay}
                className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-800">
                  {getDayName(currentDate)}
                </div>
                <div className="text-gray-600">
                  {currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              <button
                onClick={goToNextDay}
                className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="flex gap-2 mt-4 justify-center">
              {!isToday() && (
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                >
                  <Calendar size={20} />
                  Aujourd'hui
                </button>
              )}
              <button
                onClick={() => setShowWeeklySummary(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
              >
                <TrendingUp size={20} />
                Résumé de la semaine
              </button>
            </div>
          </div>

          {/* Boutons d'ajout */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button
              onClick={() => setShowAddChild(true)}
              className="px-6 py-3 bg-white text-purple-600 rounded-full font-semibold hover:bg-purple-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Ajouter un enfant
            </button>
            <button
              onClick={() => setShowAddTask(true)}
              className="px-6 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Ajouter une tâche
            </button>
            <button
              onClick={() => setShowAddDailyReward(true)}
              className="px-6 py-3 bg-white text-green-600 rounded-full font-semibold hover:bg-green-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Récompense quotidienne
            </button>
            <button
              onClick={() => setShowAddChallenge(true)}
              className="px-6 py-3 bg-white text-orange-600 rounded-full font-semibold hover:bg-orange-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Ajouter un défi
            </button>
            <button
              onClick={() => setShowAddWeeklyReward(true)}
              className="px-6 py-3 bg-white text-pink-600 rounded-full font-semibold hover:bg-pink-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Récompense hebdomadaire
            </button>
          </div>

          {/* Grille des enfants */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {children.map(child => {
              const dailyPoints = getDailyPoints(child.id, currentDate);
              const weeklyPoints = getWeeklyPoints(child.id);
              const tierInfo = getTierInfo(dailyPoints);
              const TierIcon = tierInfo.icon;
              const activeChallenges = getActiveChallenges(child.id);
              const childTasks = tasks.filter(task => child.assignedTasks.includes(task.id));

              return (
                <div key={child.id} className="bg-white rounded-xl shadow-xl p-6 relative">
                  {/* En-tête de la carte */}
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold" style={{ color: child.color }}>
                      {child.name}
                    </h2>
                    <button
                      onClick={() => removeChild(child.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* Points du jour avec icône de palier */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <TierIcon className={`${tierInfo.color} ${tierInfo.animation}`} size={40} />
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${dailyPoints < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                        {dailyPoints > 0 ? '+' : ''}{dailyPoints}
                      </div>
                      {tierInfo.label && (
                        <div className={`text-sm font-semibold ${tierInfo.color}`}>
                          {tierInfo.label}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Points hebdomadaires */}
                  <div className="bg-purple-100 rounded-lg p-3 mb-4 text-center">
                    <div className="text-sm text-purple-700 font-semibold">Total semaine</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {weeklyPoints > 0 ? '+' : ''}{weeklyPoints} pts
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setShowHistory(child.id)}
                      className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <History size={16} />
                      Historique
                    </button>
                    <button
                      onClick={() => setShowManageTasks(child.id)}
                      className="flex-1 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-sm"
                    >
                      Gérer les tâches
                    </button>
                  </div>

                  {/* Défis actifs */}
                  {activeChallenges.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">Défis en cours:</h3>
                      {activeChallenges.map(challenge => (
                        <div key={challenge.id} className="bg-orange-50 rounded-lg p-3 mb-2">
                          <div className="text-sm font-medium text-gray-800 mb-2">{challenge.name}</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolveChallenge(child.id, challenge.id, true)}
                              className="flex-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-xs"
                            >
                              Réussi! (+1)
                            </button>
                            <button
                              onClick={() => resolveChallenge(child.id, challenge.id, false)}
                              className="flex-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs"
                            >
                              Réessayer (-{challenge.pointsLost})
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tâches assignées */}
                  {childTasks.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">Tâches du jour:</h3>
                      <div className="space-y-2">
                        {childTasks.map(task => (
                          <label key={task.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={isTaskCompleted(child.id, task.id)}
                              onChange={() => toggleTaskCompletion(child.id, task.id)}
                              className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-400"
                            />
                            <span className={`text-sm ${isTaskCompleted(child.id, task.id) ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                              {task.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activer un défi */}
                  {challenges.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">Activer un défi:</h3>
                      <div className="space-y-1">
                        {challenges.map(challenge => (
                          <button
                            key={challenge.id}
                            onClick={() => activateChallenge(child.id, challenge.id)}
                            className="w-full text-left px-3 py-2 bg-yellow-50 hover:bg-yellow-100 rounded text-sm transition"
                          >
                            {challenge.name} (-{challenge.pointsLost} si raté)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Récompenses disponibles */}
                  {dailyRewards.filter(r => dailyPoints >= r.points).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-green-700 mb-2 text-sm flex items-center gap-2">
                        <Trophy size={16} />
                        Récompenses disponibles:
                      </h3>
                      <div className="space-y-1">
                        {dailyRewards
                          .filter(r => dailyPoints >= r.points)
                          .map(reward => (
                            <div key={reward.id} className="bg-green-50 px-3 py-2 rounded text-sm text-green-800">
                              🎁 {reward.name} ({reward.points} pts)
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Liste des tâches */}
          {tasks.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Tâches disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                    <span className="text-gray-800">{task.name}</span>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des récompenses quotidiennes */}
          {dailyRewards.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🎁 Récompenses quotidiennes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dailyRewards.map(reward => (
                  <div key={reward.id} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                    <span className="text-gray-800">{reward.name} ({reward.points} pts)</span>
                    <button
                      onClick={() => removeDailyReward(reward.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des défis */}
          {challenges.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">⚡ Défis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {challenges.map(challenge => (
                  <div key={challenge.id} className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                    <span className="text-gray-800">{challenge.name} (-{challenge.pointsLost} pts)</span>
                    <button
                      onClick={() => removeChallenge(challenge.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des récompenses hebdomadaires */}
          {weeklyRewards.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🏆 Récompenses hebdomadaires</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {weeklyRewards.map(reward => (
                  <div key={reward.id} className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                    <span className="text-gray-800">{reward.name} ({reward.points} pts/semaine)</span>
                    <button
                      onClick={() => removeWeeklyReward(reward.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal: Ajouter un enfant */}
          {showAddChild && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">Ajouter un enfant</h3>
                <input
                  type="text"
                  placeholder="Nom de l'enfant"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && addChild()}
                />
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Couleur:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewChildColor(color)}
                        className={`w-full h-12 rounded-lg border-4 transition ${newChildColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addChild}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setShowAddChild(false);
                      setNewChildName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Ajouter une tâche */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">Ajouter une tâche</h3>
                <input
                  type="text"
                  placeholder="Nom de la tâche"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTask(false);
                      setNewTaskName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Ajouter une récompense quotidienne */}
          {showAddDailyReward && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">Ajouter une récompense</h3>
                <input
                  type="text"
                  placeholder="Nom de la récompense"
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <input
                  type="number"
                  placeholder="Points requis"
                  value={newRewardPoints}
                  onChange={(e) => setNewRewardPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addDailyReward}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setShowAddDailyReward(false);
                      setNewRewardName('');
                      setNewRewardPoints(5);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Ajouter un défi */}
          {showAddChallenge && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">Ajouter un défi</h3>
                <input
                  type="text"
                  placeholder="Nom du défi"
                  value={newChallengeName}
                  onChange={(e) => setNewChallengeName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <input
                  type="number"
                  placeholder="Points perdus si raté"
                  value={newChallengePoints}
                  onChange={(e) => setNewChallengePoints(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addChallenge}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setShowAddChallenge(false);
                      setNewChallengeName('');
                      setNewChallengePoints(2);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Ajouter une récompense hebdomadaire */}
          {showAddWeeklyReward && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">Ajouter une récompense hebdomadaire</h3>
                <input
                  type="text"
                  placeholder="Nom de la récompense"
                  value={newWeeklyRewardName}
                  onChange={(e) => setNewWeeklyRewardName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <input
                  type="number"
                  placeholder="Points requis (semaine)"
                  value={newWeeklyRewardPoints}
                  onChange={(e) => setNewWeeklyRewardPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addWeeklyReward}
                    className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setShowAddWeeklyReward(false);
                      setNewWeeklyRewardName('');
                      setNewWeeklyRewardPoints(20);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Gérer les tâches */}
          {showManageTasks !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
                <h3 className="text-2xl font-bold mb-4">
                  Gérer les tâches de {children.find(c => c.id === showManageTasks)?.name}
                </h3>
                <div className="space-y-2 mb-4">
                  {tasks.map(task => {
                    const child = children.find(c => c.id === showManageTasks);
                    const isAssigned = child?.assignedTasks.includes(task.id);
                    return (
                      <label key={task.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => toggleTaskAssignment(showManageTasks, task.id)}
                          className="w-5 h-5 text-blue-500 rounded"
                        />
                        <span className="text-gray-800">{task.name}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowManageTasks(null)}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Modal: Historique */}
          {showHistory !== null && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">
                  Historique de {children.find(c => c.id === showHistory)?.name}
                </h3>
                <div className="space-y-2 mb-4">
                  {getWeekDates(currentDate).map(date => {
                    const points = getDailyPoints(showHistory, date);
                    const isCurrentDate = formatDate(date) === formatDate(currentDate);
                    const bgColor = points > 0 ? 'bg-green-100' : points < 0 ? 'bg-red-100' : 'bg-gray-100';
                    const textColor = points > 0 ? 'text-green-800' : points < 0 ? 'text-red-800' : 'text-gray-600';

                    return (
                      <div 
                        key={formatDate(date)} 
                        className={`${bgColor} p-3 rounded-lg ${isCurrentDate ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-800">
                              {getDayName(date)} {isCurrentDate && '(Aujourd\'hui)'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                            </div>
                          </div>
                          <div className={`text-2xl font-bold ${textColor}`}>
                            {points > 0 ? '+' : ''}{points}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowHistory(null)}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Modal: Résumé hebdomadaire */}
          {showWeeklySummary && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 max-w-4xl w-full my-8">
                <h3 className="text-3xl font-bold mb-6 text-center">📊 Résumé de la semaine</h3>

                {children.map(child => {
                  const weekDates = getWeekDates(currentDate);
                  const weeklyPoints = getWeeklyPoints(child.id);
                  const availableRewards = weeklyRewards.filter(r => weeklyPoints >= r.points);

                  return (
                    <div key={child.id} className="mb-8 bg-gray-50 rounded-xl p-6">
                      <h4 className="text-2xl font-bold mb-4" style={{ color: child.color }}>
                        {child.name} - Total: {weeklyPoints > 0 ? '+' : ''}{weeklyPoints} pts
                      </h4>

                      {/* Graphique des 7 jours */}
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <div className="flex items-end justify-between gap-2 h-40">
                          {weekDates.map(date => {
                            const points = getDailyPoints(child.id, date);
                            const maxPoints = 20;
                            const height = Math.abs(points) / maxPoints * 100;
                            const isPositive = points >= 0;

                            return (
                              <div key={formatDate(date)} className="flex-1 flex flex-col items-center">
                                <div className="flex-1 w-full flex flex-col justify-end">
                                  <div
                                    className={`w-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} rounded-t transition-all`}
                                    style={{ height: `${Math.min(height, 100)}%` }}
                                  />
                                </div>
                                <div className="text-xs font-semibold mt-2 text-gray-700">
                                  {points > 0 ? '+' : ''}{points}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {getDayName(date).slice(0, 3)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Récompenses hebdomadaires */}
                      {availableRewards.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-gray-700 mb-2">🏆 Récompenses disponibles:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {availableRewards.map(reward => {
                              const isClaimed = isWeeklyRewardClaimed(child.id, reward.id);
                              return (
                                <button
                                  key={reward.id}
                                  onClick={() => toggleWeeklyReward(child.id, reward.id)}
                                  className={`p-3 rounded-lg transition ${
                                    isClaimed 
                                      ? 'bg-purple-200 text-purple-900 border-2 border-purple-500' 
                                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{reward.name}</span>
                                    <span className="text-sm">({reward.points} pts)</span>
                                  </div>
                                  {isClaimed && (
                                    <div className="text-xs mt-1 flex items-center gap-1">
                                      <Check size={12} /> Réclamée
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => setShowWeeklySummary(false)}
                  className="w-full px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default KidsTasksApp;