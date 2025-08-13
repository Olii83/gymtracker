db.run(
                                    `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, 
                                                                   reps, weights, distance, duration_seconds, rest_time, notes)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [workoutId, exercise_id, index + 1, sets_count,
                                     reps ? JSON.stringify(reps) : null,
                                     weights ? JSON.stringify(weights) : null,
                                     distance || null, duration_seconds || null,
                                     rest_time || 90, exerciseNotes || null],
                                    function(exerciseErr) {
                                        if (exerciseErr) {
                                            console.error('Workout-Übungs-Update-Fehler:', exerciseErr);
                                            exerciseErrors++;
                                        }
                                        
                                        exercisesProcessed++;
                                        
                                        if (exercisesProcessed === exercises.length) {
                                            if (exerciseErrors > 0) {
                                                db.run('ROLLBACK');
                                                return res.status(500).json({ error: 'Fehler beim Aktualisieren der Übungen' });
                                            } else {
                                                db.run('COMMIT');
                                                logSystemAction(req.user.id, 'WORKOUT_UPDATED', `Training aktualisiert: ${name}`, req.ip, req.get('User-Agent'));
                                                return res.json({ message: 'Training erfolgreich aktualisiert' });
                                            }
                                        }
                                    }
                                );
                            });
                        } else {
                            // Keine Übungen, trotzdem commiten
                            db.run('COMMIT');
                            logSystemAction(req.user.id, 'WORKOUT_UPDATED', `Training aktualisiert: ${name}`, req.ip, req.get('User-Agent'));
                            return res.json({ message: 'Training erfolgreich aktualisiert' });
                        }
                    });
                }
            );
        });
    });
});

/**
 * Workout löschen
 */
app.delete('/api/workouts/:id', authenticateToken, (req, res) => {
    const workoutId = parseInt(req.params.id);
    
    // Berechtigung prüfen
    db.get('SELECT id, name FROM workouts WHERE id = ? AND user_id = ?', [workoutId, req.user.id], (err, workout) => {
        if (err) {
            console.error('Workout-Lösch-Berechtigungs-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!workout) {
            return res.status(404).json({ error: 'Training nicht gefunden' });
        }
        
        // Workout löschen (Übungen werden durch CASCADE automatisch gelöscht)
        db.run('DELETE FROM workouts WHERE id = ?', [workoutId], function(deleteErr) {
            if (deleteErr) {
                console.error('Workout-Lösch-Fehler:', deleteErr);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                logSystemAction(req.user.id, 'WORKOUT_DELETED', `Training gelöscht: ${workout.name}`, req.ip, req.get('User-Agent'));
                res.json({ message: 'Training erfolgreich gelöscht' });
            }
        });
    });
});

// ===== TEMPLATE-ROUTEN =====

/**
 * Alle Templates des Benutzers abrufen
 */
app.get('/api/templates', authenticateToken, (req, res) => {
    const { is_public } = req.query;
    
    let sql = `
        SELECT t.*, 
               COUNT(te.id) as exercise_count,
               u.username as creator_name
        FROM workout_templates t
        LEFT JOIN template_exercises te ON t.id = te.template_id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE (t.user_id = ? OR t.is_public = 1)
    `;
    let params = [req.user.id];
    
    if (is_public !== undefined) {
        sql += ' AND t.is_public = ?';
        params.push(is_public === 'true' ? 1 : 0);
    }
    
    sql += ` 
        GROUP BY t.id
        ORDER BY t.created_at DESC
    `;
    
    db.all(sql, params, (err, templates) => {
        if (err) {
            console.error('Template-Abruf-Fehler:', err);
            res.status(500).json({ error: 'Interner Serverfehler' });
        } else {
            res.json(templates);
        }
    });
});

/**
 * Einzelnes Template mit Übungen abrufen
 */
app.get('/api/templates/:id', authenticateToken, (req, res) => {
    const templateId = parseInt(req.params.id);
    
    // Template-Grunddaten
    db.get(
        'SELECT * FROM workout_templates WHERE id = ? AND (user_id = ? OR is_public = 1)',
        [templateId, req.user.id],
        (err, template) => {
            if (err) {
                console.error('Template-Detail-Fehler:', err);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            
            if (!template) {
                return res.status(404).json({ error: 'Vorlage nicht gefunden' });
            }
            
            // Template-Übungen laden
            db.all(
                `SELECT te.*, e.name as exercise_name, e.category, e.muscle_group
                 FROM template_exercises te
                 JOIN exercises e ON te.exercise_id = e.id
                 WHERE te.template_id = ?
                 ORDER BY te.exercise_order ASC`,
                [templateId],
                (exerciseErr, exercises) => {
                    if (exerciseErr) {
                        console.error('Template-Übungs-Fehler:', exerciseErr);
                        return res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                    
                    // JSON-Felder parsen
                    exercises.forEach(exercise => {
                        try {
                            exercise.suggested_reps = exercise.suggested_reps ? JSON.parse(exercise.suggested_reps) : [10, 10, 10];
                        } catch (parseErr) {
                            console.warn('JSON-Parse-Fehler für Template-Übung:', exercise.id, parseErr);
                            exercise.suggested_reps = [10, 10, 10];
                        }
                    });
                    
                    template.exercises = exercises;
                    res.json(template);
                }
            );
        }
    );
});

/**
 * Neues Template erstellen
 */
app.post('/api/templates', authenticateToken, (req, res) => {
    let { name, description, category, estimated_duration, difficulty_level, is_public, exercises } = req.body;
    
    // Input-Validierung
    if (!name) {
        return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    
    // Eingaben bereinigen
    name = sanitizeInput(name);
    description = description ? sanitizeInput(description) : null;
    category = category ? sanitizeInput(category) : null;
    
    // Validierungen
    if (name.length < 1 || name.length > 100) {
        return res.status(400).json({ error: 'Name muss zwischen 1 und 100 Zeichen lang sein' });
    }
    
    if (difficulty_level && (difficulty_level < 1 || difficulty_level > 5)) {
        return res.status(400).json({ error: 'Schwierigkeitsgrad muss zwischen 1 und 5 liegen' });
    }
    
    // Nur Admins können öffentliche Templates erstellen
    if (is_public && req.user.role !== 'admin') {
        is_public = 0;
    }
    
    // Transaction für Template + Übungen
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Template erstellen
        db.run(
            `INSERT INTO workout_templates (user_id, name, description, category, estimated_duration, 
                                           difficulty_level, is_public)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name, description, category, estimated_duration || null, 
             difficulty_level || 1, is_public ? 1 : 0],
            function(err) {
                if (err) {
                    console.error('Template-Erstellungs-Fehler:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Interner Serverfehler' });
                }
                
                const templateId = this.lastID;
                
                // Übungen hinzufügen falls vorhanden
                if (exercises && exercises.length > 0) {
                    let exerciseErrors = 0;
                    let exercisesProcessed = 0;
                    
                    exercises.forEach((exercise, index) => {
                        const { exercise_id, suggested_sets, suggested_reps, suggested_weight, suggested_rest_time, notes } = exercise;
                        
                        if (!exercise_id) {
                            exerciseErrors++;
                            exercisesProcessed++;
                            if (exercisesProcessed === exercises.length) {
                                if (exerciseErrors > 0) {
                                    db.run('ROLLBACK');
                                    return res.status(400).json({ error: 'Ungültige Übungsdaten' });
                                } else {
                                    db.run('COMMIT');
                                    logSystemAction(req.user.id, 'TEMPLATE_CREATED', `Vorlage erstellt: ${name}`, req.ip, req.get('User-Agent'));
                                    return res.status(201).json({ 
                                        message: 'Vorlage erfolgreich erstellt',
                                        templateId: templateId
                                    });
                                }
                            }
                            return;
                        }
                        
                        db.run(
                            `INSERT INTO template_exercises (template_id, exercise_id, exercise_order, suggested_sets, 
                                                           suggested_reps, suggested_weight, suggested_rest_time, notes)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [templateId, exercise_id, index + 1, suggested_sets || 3,
                             suggested_reps ? JSON.stringify(suggested_reps) : JSON.stringify([10, 10, 10]),
                             suggested_weight || 0, suggested_rest_time || 90, notes || null],
                            function(exerciseErr) {
                                if (exerciseErr) {
                                    console.error('Template-Übungs-Fehler:', exerciseErr);
                                    exerciseErrors++;
                                }
                                
                                exercisesProcessed++;
                                
                                if (exercisesProcessed === exercises.length) {
                                    if (exerciseErrors > 0) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Fehler beim Hinzufügen der Übungen' });
                                    } else {
                                        db.run('COMMIT');
                                        logSystemAction(req.user.id, 'TEMPLATE_CREATED', `Vorlage erstellt: ${name}`, req.ip, req.get('User-Agent'));
                                        return res.status(201).json({ 
                                            message: 'Vorlage erfolgreich erstellt',
                                            templateId: templateId
                                        });
                                    }
                                }
                            }
                        );
                    });
                } else {
                    // Keine Übungen, trotzdem commiten
                    db.run('COMMIT');
                    logSystemAction(req.user.id, 'TEMPLATE_CREATED', `Vorlage erstellt: ${name}`, req.ip, req.get('User-Agent'));
                    return res.status(201).json({ 
                        message: 'Vorlage erfolgreich erstellt',
                        templateId: templateId
                    });
                }
            }
        );
    });
});

/**
 * Template löschen
 */
app.delete('/api/templates/:id', authenticateToken, (req, res) => {
    const templateId = parseInt(req.params.id);
    
    // Berechtigung prüfen
    const checkPermissionSql = req.user.role === 'admin' 
        ? 'SELECT id, name, user_id FROM workout_templates WHERE id = ?'
        : 'SELECT id, name, user_id FROM workout_templates WHERE id = ? AND user_id = ?';
    
    const checkParams = req.user.role === 'admin' 
        ? [templateId] 
        : [templateId, req.user.id];
    
    db.get(checkPermissionSql, checkParams, (err, template) => {
        if (err) {
            console.error('Template-Lösch-Berechtigungs-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!template) {
            return res.status(404).json({ error: 'Vorlage nicht gefunden oder keine Berechtigung' });
        }
        
        // Template löschen (Übungen werden durch CASCADE automatisch gelöscht)
        db.run('DELETE FROM workout_templates WHERE id = ?', [templateId], function(deleteErr) {
            if (deleteErr) {
                console.error('Template-Lösch-Fehler:', deleteErr);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                logSystemAction(req.user.id, 'TEMPLATE_DELETED', `Vorlage gelöscht: ${template.name}`, req.ip, req.get('User-Agent'));
                res.json({ message: 'Vorlage erfolgreich gelöscht' });
            }
        });
    });
});

// ===== DASHBOARD-ROUTEN =====

/**
 * Dashboard-Statistiken abrufen
 */
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const stats = {};
    
    // Gesamtzahl Workouts
    db.get(
        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ?',
        [userId],
        (err, result) => {
            if (err) {
                console.error('Dashboard-Stats-Fehler:', err);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            
            stats.totalWorkouts = result.count;
            
            // Workouts diese Woche
            db.get(
                'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= date("now", "-7 days")',
                [userId],
                (err2, result2) => {
                    if (err2) {
                        console.error('Dashboard-Stats-Woche-Fehler:', err2);
                        return res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                    
                    stats.thisWeekWorkouts = result2.count;
                    
                    // Gesamte Trainingszeit
                    db.get(
                        'SELECT SUM(duration_minutes) as total FROM workouts WHERE user_id = ? AND duration_minutes IS NOT NULL',
                        [userId],
                        (err3, result3) => {
                            if (err3) {
                                console.error('Dashboard-Stats-Zeit-Fehler:', err3);
                                return res.status(500).json({ error: 'Interner Serverfehler' });
                            }
                            
                            stats.totalTime = result3.total || 0;
                            
                            // Letzte Workouts
                            db.all(
                                'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5',
                                [userId],
                                (err4, workouts) => {
                                    if (err4) {
                                        console.error('Dashboard-Stats-Workouts-Fehler:', err4);
                                        return res.status(500).json({ error: 'Interner Serverfehler' });
                                    }
                                    
                                    stats.recentWorkouts = workouts;
                                    
                                    // Workout-Streak berechnen
                                    db.all(
                                        'SELECT DISTINCT date FROM workouts WHERE user_id = ? ORDER BY date DESC LIMIT 30',
                                        [userId],
                                        (err5, dates) => {
                                            if (err5) {
                                                console.error('Dashboard-Stats-Streak-Fehler:', err5);
                                                stats.currentStreak = 0;
                                                return res.json(stats);
                                            }
                                            
                                            // Streak berechnen
                                            let streak = 0;
                                            const today = new Date();
                                            const yesterday = new Date(today);
                                            yesterday.setDate(yesterday.getDate() - 1);
                                            
                                            // Prüfe ob heute oder gestern trainiert wurde
                                            const todayStr = today.toISOString().split('T')[0];
                                            const yesterdayStr = yesterday.toISOString().split('T')[0];
                                            
                                            let currentDate = new Date();
                                            if (dates.length > 0 && dates[0].date === todayStr) {
                                                // Heute trainiert, beginne von heute
                                                currentDate = today;
                                            } else if (dates.length > 0 && dates[0].date === yesterdayStr) {
                                                // Gestern trainiert, beginne von gestern
                                                currentDate = yesterday;
                                            } else {
                                                // Weder heute noch gestern trainiert
                                                stats.currentStreak = 0;
                                                return res.json(stats);
                                            }
                                            
                                            // Streak rückwärts zählen
                                            for (const dateRow of dates) {
                                                const workoutDate = dateRow.date;
                                                const expectedDate = currentDate.toISOString().split('T')[0];
                                                
                                                if (workoutDate === expectedDate) {
                                                    streak++;
                                                    currentDate.setDate(currentDate.getDate() - 1);
                                                } else {
                                                    break;
                                                }
                                            }
                                            
                                            stats.currentStreak = streak;
                                            res.json(stats);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// ===== ADMIN-ROUTEN =====

/**
 * Alle Benutzer abrufen (Admin)
 */
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const { limit = 100, offset = 0, search } = req.query;
    
    let sql = `
        SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
               u.is_active, u.created_at, u.updated_at, u.last_login,
               COUNT(w.id) as workout_count
        FROM users u
        LEFT JOIN workouts w ON u.id = w.user_id
    `;
    let params = [];
    
    if (search) {
        sql += ` WHERE (u.username LIKE ? OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    
    sql += ` 
        GROUP BY u.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, users) => {
        if (err) {
            console.error('Admin-Benutzer-Abruf-Fehler:', err);
            res.status(500).json({ error: 'Interner Serverfehler' });
        } else {
            res.json(users);
        }
    });
});

/**
 * Admin-Statistiken abrufen
 */
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = {};
    
    // Benutzerstatistiken
    db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
        if (err) {
            console.error('Admin-Stats-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        stats.totalUsers = result.count;
        
        db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1', (err2, result2) => {
            if (err2) return res.status(500).json({ error: 'Interner Serverfehler' });
            stats.activeUsers = result2.count;
            
            // Workout-Statistiken
            db.get('SELECT COUNT(*) as count FROM workouts', (err3, result3) => {
                if (err3) return res.status(500).json({ error: 'Interner Serverfehler' });
                stats.totalWorkouts = result3.count;
                
                // Übungsstatistiken
                db.get('SELECT COUNT(*) as count FROM exercises', (err4, result4) => {
                    if (err4) return res.status(500).json({ error: 'Interner Serverfehler' });
                    stats.totalExercises = result4.count;
                    
                    // Systemlogs (letzte 30 Tage)
                    db.get('SELECT COUNT(*) as count FROM system_logs WHERE created_at >= date("now", "-30 days")', (err5, result5) => {
                        if (err5) return res.status(500).json({ error: 'Interner Serverfehler' });
                        stats.recentLogEntries = result5.count;
                        
                        // Registrierungen letzte 30 Tage
                        db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= date("now", "-30 days")', (err6, result6) => {
                            if (err6) return res.status(500).json({ error: 'Interner Serverfehler' });
                            stats.recentRegistrations = result6.count;
                            
                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

/**
 * Benutzerpasswort zurücksetzen (Admin)
 */
app.post('/api/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || !validatePassword(newPassword)) {
            return res.status(400).json({ error: 'Passwort muss zwischen 6 und 128 Zeichen lang sein' });
        }
        
        // Prüfen ob Benutzer existiert
        db.get('SELECT username FROM users WHERE id = ?', [userId], async (err, user) => {
            if (err) {
                console.error('Admin-Passwort-Reset-Fehler:', err);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'Benutzer nicht gefunden' });
            }
            
            try {
                const hashedPassword = await bcrypt.hash(newPassword, 12);
                
                db.run(
                    'UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
                    [hashedPassword, userId],
                    function(updateErr) {
                        if (updateErr) {
                            console.error('Admin-Passwort-Update-Fehler:', updateErr);
                            res.status(500).json({ error: 'Interner Serverfehler' });
                        } else if (this.changes === 0) {
                            res.status(404).json({ error: 'Benutzer nicht gefunden' });
                        } else {
                            logSystemAction(req.user.id, 'ADMIN_PASSWORD_RESET', `Passwort zurückgesetzt für Benutzer: ${user.username}`, req.ip, req.get('User-Agent'));
                            res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
                        }
                    }
                );
            } catch (bcryptError) {
                console.error('Admin-Bcrypt-Fehler:', bcryptError);
                res.status(500).json({ error: 'Interner Serverfehler' });
            }
        });
    } catch (error) {
        console.error('Admin-Passwort-Reset-Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Benutzerstatus ändern (Admin)
 */
app.put('/api/admin/users/:userId/status', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active muss ein Boolean sein' });
    }
    
    // Prüfen ob Admin sich selbst deaktivieren will
    if (parseInt(userId) === req.user.id && !is_active) {
        return res.status(400).json({ error: 'Sie können sich nicht selbst deaktivieren' });
    }
    
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Admin-Status-Change-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        
        db.run(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active ? 1 : 0, userId],
            function(updateErr) {
                if (updateErr) {
                    console.error('Admin-Benutzerstatus-Update-Fehler:', updateErr);
                    res.status(500).json({ error: 'Interner Serverfehler' });
                } else {
                    const action = is_active ? 'aktiviert' : 'deaktiviert';
                    logSystemAction(req.user.id, 'ADMIN_USER_STATUS_CHANGED', `Benutzer ${user.username} ${action}`, req.ip, req.get('User-Agent'));
                    res.json({ message: `Benutzer erfolgreich ${action}` });
                }
            }
        );
    });
});

/**
 * Benutzer löschen (Admin)
 */
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    
    // Verhindern, dass Admin sich selbst löscht
    if (parseInt(userId) === req.user.id) {
        return res.status(400).json({ error: 'Sie können Ihr eigenes Konto nicht löschen' });
    }
    
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Admin-User-Delete-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }
        
        db.run('DELETE FROM users WHERE id = ?', [userId], function(deleteErr) {
            if (deleteErr) {
                console.error('Admin-Benutzer-Lösch-Fehler:', deleteErr);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                logSystemAction(req.user.id, 'ADMIN_USER_DELETED', `Benutzer gelöscht: ${user.username}`, req.ip, req.get('User-Agent'));
                res.json({ message: 'Benutzer erfolgreich gelöscht' });
            }
        });
    });
});

/**
 * System-Logs abrufen (Admin)
 */
app.get('/api/admin/logs', authenticateToken, requireAdmin, (req, res) => {
    const { limit = 100, offset = 0, action, user_id, date_from, date_to } = req.query;
    
    let sql = `
        SELECT l.*, u.username
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE 1=1
    `;
    let params = [];
    
    // Filter anwenden
    if (action) {
        sql += ' AND l.action = ?';
        params.push(action);
    }
    
    if (user_id) {
        sql += ' AND l.user_id = ?';
        params.push(user_id);
    }
    
    if (date_from) {
        sql += ' AND l.created_at >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND l.created_at <= ?';
        params.push(date_to + ' 23:59:59');
    }
    
    sql += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, logs) => {
        if (err) {
            console.error('Admin-Logs-Abruf-Fehler:', err);
            res.status(500).json({ error: 'Interner Serverfehler' });
        } else {
            res.json(logs);
        }
    });
});

// ===== ALLGEMEINE ROUTEN =====

/**
 * Health-Check-Endpoint
 */
app.get('/api/health', (req, res) => {
    db.get('SELECT 1 as test', (err) => {
        if (err) {
            console.error('Health-Check-Datenbankfehler:', err);
            res.status(503).json({ 
                status: 'error', 
                message: 'Datenbankverbindung fehlgeschlagen',
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({ 
                status: 'ok', 
                message: 'Gym Tracker läuft ordnungsgemäß',
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                database: 'SQLite',
                node_version: process.version,
                uptime: Math.floor(process.uptime()),
                memory_usage: process.memoryUsage()
            });
        }
    });
});

/**
 * API-Info-Endpoint
 */
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Gym Tracker API',
        version: '2.0.0',
        description: 'RESTful API für Gym Tracker - Fitness-Tracking-System',
        endpoints: {
            auth: [
                'POST /api/auth/login',
                'POST /api/auth/register',
                'POST /api/auth/refresh',
                'POST /api/auth/logout'
            ],
            user: [
                'GET /api/user/profile',
                'PUT /api/user/profile',
                'PUT /api/user/password',
                'GET /api/user/preferences',
                'PUT /api/user/preferences'
            ],
            exercises: [
                'GET /api/exercises',
                'GET /api/exercises/:id',
                'POST /api/exercises',
                'PUT /api/exercises/:id',
                'DELETE /api/exercises/:id'
            ],
            workouts: [
                'GET /api/workouts',
                'GET /api/workouts/:id',
                'POST /api/workouts',
                'PUT /api/workouts/:id',
                'DELETE /api/workouts/:id'
            ],
            templates: [
                'GET /api/templates',
                'GET /api/templates/:id',
                'POST /api/templates',
                'DELETE /api/templates/:id'
            ],
            dashboard: [
                'GET /api/dashboard/stats'
            ],
            admin: [
                'GET /api/admin/users',
                'GET /api/admin/stats',
                'POST /api/admin/users/:userId/reset-password',
                'PUT /api/admin/users/:userId/status',
                'DELETE /api/admin/users/:userId',
                'GET /api/admin/logs'
            ]
        },
        database: 'SQLite',
        authentication: 'JWT Bearer Token',
        rateLimit: '200 requests per 15 minutes',
        documentation: 'https://github.com/Olii83/gymtracker'
    });
});

/**
 * Datenbank-Wartungs-Endpoint (Admin)
 */
app.post('/api/admin/maintenance', authenticateToken, requireAdmin, (req, res) => {
    const { action } = req.body;
    
    switch (action) {
        case 'vacuum':
            db.exec('VACUUM; ANALYZE;', (err) => {
                if (err) {
                    console.error('Datenbank-Vacuum-Fehler:', err);
                    res.status(500).json({ error: 'Fehler bei Datenbank-Optimierung' });
                } else {
                    logSystemAction(req.user.id, 'ADMIN_DB_VACUUM', null, req.ip, req.get('User-Agent'));
                    res.json({ message: 'Datenbank erfolgreich optimiert' });
                }
            });
            break;
            
        case 'cleanup_logs':
            db.run('DELETE FROM system_logs WHERE created_at < date("now", "-90 days")', function(err) {
                if (err) {
                    console.error('Log-Cleanup-Fehler:', err);
                    res.status(500).json({ error: 'Fehler beim Bereinigen der Logs' });
                } else {
                    logSystemAction(req.user.id, 'ADMIN_LOGS_CLEANUP', `${this.changes} alte Logs gelöscht`, req.ip, req.get('User-Agent'));
                    res.json({ 
                        message: 'Logs erfolgreich bereinigt',
                        deletedRows: this.changes
                    });
                }
            });
            break;
            
        case 'integrity_check':
            db.get('PRAGMA integrity_check;', (err, result) => {
                if (err) {
                    console.error('Integritätsprüfungs-Fehler:', err);
                    res.status(500).json({ error: 'Fehler bei Integritätsprüfung' });
                } else {
                    logSystemAction(req.user.id, 'ADMIN_DB_INTEGRITY_CHECK', result.integrity_check, req.ip, req.get('User-Agent'));
                    res.json({ 
                        message: 'Integritätsprüfung abgeschlossen',
                        result: result.integrity_check
                    });
                }
            });
            break;
            
        default:
            res.status(400).json({ error: 'Ungültige Wartungsaktion' });
    }
});

/**
 * Backup-Endpoint (Admin)
 */
app.post('/api/admin/backup', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `gym_tracker_backup_${timestamp}.db`;
        const backupPath = path.join(__dirname, 'backups', backupFileName);
        
        // Backup-Verzeichnis erstellen falls nicht vorhanden
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        
        // SQLite-Backup erstellen
        const backup = db.backup(backupPath);
        
        backup.on('done', () => {
            logSystemAction(req.user.id, 'ADMIN_BACKUP_CREATED', backupFileName, req.ip, req.get('User-Agent'));
            res.json({ 
                message: 'Backup erfolgreich erstellt',
                filename: backupFileName,
                path: backupPath
            });
        });
        
        backup.on('error', (err) => {
            console.error('Backup-Fehler:', err);
            res.status(500).json({ error: 'Fehler beim Erstellen des Backups' });
        });
        
    } catch (error) {
        console.error('Backup-Initialisierungs-Fehler:', error);
        res.status(500).json({ error: 'Fehler beim Initialisieren des Backups' });
    }
});

// ===== ERROR-HANDLING =====

/**
 * 404-Handler für unbekannte Routen
 */
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API-Endpunkt nicht gefunden',
        method: req.method,
        path: req.path,
        message: 'Bitte überprüfen Sie die URL und HTTP-Methode'
    });
});

/**
 * Globaler Fehler-Handler
 */
app.use((err, req, res, next) => {
    console.error('Unbehandelter Fehler:', err);
    
    // JWT-Fehler
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Ungültiger Token' });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token abgelaufen' });
    }
    
    // JSON-Parse-Fehler
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Ungültiges JSON-Format' });
    }
    
    // Rate-Limiting-Fehler
    if (err.status === 429) {
        return res.status(429).json({ 
            error: 'Zu viele Anfragen',
            retryAfter: err.retryAfter
        });
    }
    
    // Standard-Serverfehler
    res.status(500).json({ 
        error: 'Interner Serverfehler',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Ein unerwarteter Fehler ist aufgetreten'
    });
});

/**
 * Frontend-Dateien servieren (SPA-Support)
 */
app.get('*', (req, res) => {
    // Prüfe ob Datei existiert
    const filePath = path.join(__dirname, 'public', req.path);
    
    // Für alle anderen Routen, sende index.html (SPA-Support)
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            console.error('Fehler beim Senden der index.html:', err);
            res.status(500).send('Fehler beim Laden der Anwendung');
        }
    });
});

// ===== SERVER-START UND SHUTDOWN =====

/**
 * Graceful Shutdown-Handler
 */
function gracefulShutdown(signal) {
    console.log(`\n🛑 ${signal} erhalten. Starte Graceful Shutdown...`);
    
    // Rate-Limit-Map bereinigen
    rateLimitMap.clear();
    
    // Server schließen (verhindert neue Verbindungen)
    server.close((err) => {
        if (err) {
            console.error('❌ Fehler beim Schließen des Servers:', err);
            process.exit(1);
        }
        
        console.log('✅ HTTP-Server geschlossen');
        
        // Datenbank schließen
        db.close((dbErr) => {
            if (dbErr) {
                console.error('❌ Fehler beim Schließen der Datenbank:', dbErr);
                process.exit(1);
            }
            
            console.log('✅ Datenbankverbindung geschlossen');
            console.log('✅ Graceful Shutdown abgeschlossen');
            process.exit(0);
        });
    });
    
    // Timeout für erzwungenes Beenden nach 30 Sekunden
    setTimeout(() => {
        console.error('❌ Graceful Shutdown Timeout - erzwinge Beendigung');
        process.exit(1);
    }, 30000);
}

// Shutdown-Signal-Handler registrieren
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unbehandelte Promise-Rejections abfangen
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unbehandelte Promise-Rejection:', reason);
    console.error('Promise:', promise);
    // Nicht beenden, nur loggen
});

// Unbehandelte Exceptions abfangen
process.on('uncaughtException', (err) => {
    console.error('Unbehandelte Exception:', err);
    // Bei kritischen Fehlern Graceful Shutdown
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

/**
 * Server starten
 */
const server = app.listen(PORT, () => {
    console.log('\n🏋️‍♂️ =======================================');
    console.log('🏋️‍♀️ GYM TRACKER SERVER GESTARTET');
    console.log('🏋️‍♂️ =======================================');
    console.log(`📱 Server läuft auf: http://localhost:${PORT}`);
    console.log(`💾 Datenbank: ${DB_PATH}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Node.js Version: ${process.version}`);
    console.log(`📊 Rate Limiting: 200 req/15min`);
    console.log(`⏰ Gestartet am: ${new Date().toLocaleString('de-DE')}`);
    console.log('🏋️‍♂️ =======================================');
    console.log('');
    console.log('🔗 Wichtige URLs:');
    console.log(`   📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   📋 API Info: http://localhost:${PORT}/api/info`);
    console.log(`   🏠 Frontend: http://localhost:${PORT}`);
    console.log('');
    console.log('🔑 Standard Admin-Zugang:');
    console.log('   👤 Benutzername: admin');
    console.log('   🔒 Passwort: admin123');
    console.log('   ⚠️  WICHTIG: Ändern Sie das Passwort nach der ersten Anmeldung!');
    console.log('');
    console.log('🎯 Ready für Fitness-Tracking!');
    console.log('🏋️‍♀️ =======================================\n');
    
    // System-Log für Server-Start
    logSystemAction(null, 'SERVER_STARTED', `Server gestartet auf Port ${PORT}`, 'localhost', 'system');
});

// Server-Timeout konfigurieren
server.timeout = 120000; // 2 Minuten
server.keepAliveTimeout = 65000; // 65 Sekunden
server.headersTimeout = 66000; // 66 Sekunden

module.exports = app;                        } else if (err.message.includes('email')) {
                            res.status(409).json({ error: 'E-Mail bereits vorhanden' });
                        } else {
                            res.status(409).json({ error: 'Benutzername oder E-Mail bereits vorhanden' });
                        }
                    } else {
                        console.error('Profil-Update-Fehler:', err);
                        res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                } else if (this.changes === 0) {
                    res.status(404).json({ error: 'Benutzer nicht gefunden' });
                } else {
                    logSystemAction(req.user.id, 'PROFILE_UPDATED', null, req.ip, req.get('User-Agent'));
                    res.json({ message: 'Profil erfolgreich aktualisiert' });
                }
            }
        );
    } catch (error) {
        console.error('Profil-Update-Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Passwort ändern
 */
app.put('/api/user/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
        }
        
        if (!validatePassword(newPassword)) {
            return res.status(400).json({ error: 'Neues Passwort muss zwischen 6 und 128 Zeichen lang sein' });
        }
        
        // Aktuellen Benutzer laden
        db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], async (err, user) => {
            if (err) {
                console.error('Passwort-Änderungs-Fehler:', err);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'Benutzer nicht gefunden' });
            }
            
            try {
                // Aktuelles Passwort prüfen
                const validCurrentPassword = await bcrypt.compare(currentPassword, user.password_hash);
                
                if (!validCurrentPassword) {
                    logSystemAction(req.user.id, 'PASSWORD_CHANGE_FAILED', 'Falsches aktuelles Passwort', req.ip, req.get('User-Agent'));
                    return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
                }
                
                // Neues Passwort hashen
                const hashedNewPassword = await bcrypt.hash(newPassword, 12);
                
                // Passwort in Datenbank aktualisieren
                db.run(
                    'UPDATE users SET password_hash = ? WHERE id = ?',
                    [hashedNewPassword, req.user.id],
                    function(dbErr) {
                        if (dbErr) {
                            console.error('Passwort-Update-Fehler:', dbErr);
                            res.status(500).json({ error: 'Interner Serverfehler' });
                        } else {
                            logSystemAction(req.user.id, 'PASSWORD_CHANGED', null, req.ip, req.get('User-Agent'));
                            res.json({ message: 'Passwort erfolgreich geändert' });
                        }
                    }
                );
            } catch (bcryptError) {
                console.error('Bcrypt-Fehler:', bcryptError);
                res.status(500).json({ error: 'Interner Serverfehler' });
            }
        });
    } catch (error) {
        console.error('Passwort-Änderungs-Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Benutzereinstellungen abrufen/aktualisieren
 */
app.get('/api/user/preferences', authenticateToken, (req, res) => {
    db.get(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [req.user.id],
        (err, preferences) => {
            if (err) {
                console.error('Einstellungen-Abruf-Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                res.json(preferences || {
                    user_id: req.user.id,
                    preferred_units: 'metric',
                    default_rest_time: 90,
                    theme: 'light',
                    language: 'de'
                });
            }
        }
    );
});

app.put('/api/user/preferences', authenticateToken, (req, res) => {
    const { preferred_units, default_rest_time, theme, language, privacy_settings, notification_settings } = req.body;
    
    // Validierung
    if (preferred_units && !['metric', 'imperial'].includes(preferred_units)) {
        return res.status(400).json({ error: 'Ungültiges Einheitensystem' });
    }
    
    if (default_rest_time && (default_rest_time < 10 || default_rest_time > 600)) {
        return res.status(400).json({ error: 'Pausenzeit muss zwischen 10 und 600 Sekunden liegen' });
    }
    
    if (theme && !['light', 'dark', 'auto'].includes(theme)) {
        return res.status(400).json({ error: 'Ungültiges Theme' });
    }
    
    db.run(
        `INSERT OR REPLACE INTO user_preferences 
         (user_id, preferred_units, default_rest_time, theme, language, privacy_settings, notification_settings)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user.id,
            preferred_units || 'metric',
            default_rest_time || 90,
            theme || 'light',
            language || 'de',
            privacy_settings ? JSON.stringify(privacy_settings) : null,
            notification_settings ? JSON.stringify(notification_settings) : null
        ],
        function(err) {
            if (err) {
                console.error('Einstellungen-Update-Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                res.json({ message: 'Einstellungen erfolgreich gespeichert' });
            }
        }
    );
});

// ===== ÜBUNGS-ROUTEN =====

/**
 * Alle Übungen abrufen (öffentliche + eigene)
 */
app.get('/api/exercises', authenticateToken, (req, res) => {
    const { category, muscle_group, search } = req.query;
    
    let sql = `
        SELECT e.*, u.username as creator_name
        FROM exercises e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE (e.is_public = 1 OR e.created_by = ?)
    `;
    let params = [req.user.id];
    
    // Filter anwenden
    if (category) {
        sql += ' AND e.category = ?';
        params.push(category);
    }
    
    if (muscle_group) {
        sql += ' AND e.muscle_group = ?';
        params.push(muscle_group);
    }
    
    if (search) {
        sql += ' AND (e.name LIKE ? OR e.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY e.name ASC';
    
    db.all(sql, params, (err, exercises) => {
        if (err) {
            console.error('Übungs-Abruf-Fehler:', err);
            res.status(500).json({ error: 'Interner Serverfehler' });
        } else {
            res.json(exercises);
        }
    });
});

/**
 * Einzelne Übung abrufen
 */
app.get('/api/exercises/:id', authenticateToken, (req, res) => {
    const exerciseId = parseInt(req.params.id);
    
    db.get(
        `SELECT e.*, u.username as creator_name
         FROM exercises e
         LEFT JOIN users u ON e.created_by = u.id
         WHERE e.id = ? AND (e.is_public = 1 OR e.created_by = ?)`,
        [exerciseId, req.user.id],
        (err, exercise) => {
            if (err) {
                console.error('Übungs-Detail-Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else if (!exercise) {
                res.status(404).json({ error: 'Übung nicht gefunden' });
            } else {
                res.json(exercise);
            }
        }
    );
});

/**
 * Neue Übung erstellen
 */
app.post('/api/exercises', authenticateToken, (req, res) => {
    let { name, category, muscle_group, description, instructions, difficulty_level, equipment, is_public } = req.body;
    
    // Input-Validierung
    if (!name || !category || !muscle_group) {
        return res.status(400).json({ error: 'Name, Kategorie und Muskelgruppe sind erforderlich' });
    }
    
    // Eingaben bereinigen
    name = sanitizeInput(name);
    category = sanitizeInput(category);
    muscle_group = sanitizeInput(muscle_group);
    description = description ? sanitizeInput(description) : null;
    instructions = instructions ? sanitizeInput(instructions) : null;
    equipment = equipment ? sanitizeInput(equipment) : null;
    
    // Validierungen
    if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ error: 'Name muss zwischen 2 und 100 Zeichen lang sein' });
    }
    
    if (difficulty_level && (difficulty_level < 1 || difficulty_level > 5)) {
        return res.status(400).json({ error: 'Schwierigkeitsgrad muss zwischen 1 und 5 liegen' });
    }
    
    // Nur Admins können öffentliche Übungen erstellen
    if (is_public && req.user.role !== 'admin') {
        is_public = 0;
    }
    
    db.run(
        `INSERT INTO exercises (name, category, muscle_group, description, instructions, 
                               difficulty_level, equipment, is_public, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category, muscle_group, description, instructions, 
         difficulty_level || 1, equipment, is_public ? 1 : 0, req.user.id],
        function(err) {
            if (err) {
                console.error('Übungs-Erstellungs-Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else {
                logSystemAction(req.user.id, 'EXERCISE_CREATED', `Übung erstellt: ${name}`, req.ip, req.get('User-Agent'));
                res.status(201).json({ 
                    message: 'Übung erfolgreich erstellt',
                    exerciseId: this.lastID
                });
            }
        }
    );
});

/**
 * Übung aktualisieren
 */
app.put('/api/exercises/:id', authenticateToken, (req, res) => {
    const exerciseId = parseInt(req.params.id);
    let { name, category, muscle_group, description, instructions, difficulty_level, equipment, is_public } = req.body;
    
    // Input-Validierung
    if (!name || !category || !muscle_group) {
        return res.status(400).json({ error: 'Name, Kategorie und Muskelgruppe sind erforderlich' });
    }
    
    // Eingaben bereinigen
    name = sanitizeInput(name);
    category = sanitizeInput(category);
    muscle_group = sanitizeInput(muscle_group);
    description = description ? sanitizeInput(description) : null;
    instructions = instructions ? sanitizeInput(instructions) : null;
    equipment = equipment ? sanitizeInput(equipment) : null;
    
    // Berechtigung prüfen
    const checkPermissionSql = req.user.role === 'admin' 
        ? 'SELECT id, created_by FROM exercises WHERE id = ?'
        : 'SELECT id, created_by FROM exercises WHERE id = ? AND created_by = ?';
    
    const checkParams = req.user.role === 'admin' 
        ? [exerciseId] 
        : [exerciseId, req.user.id];
    
    db.get(checkPermissionSql, checkParams, (err, exercise) => {
        if (err) {
            console.error('Übungs-Berechtigungs-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!exercise) {
            return res.status(404).json({ error: 'Übung nicht gefunden oder keine Berechtigung' });
        }
        
        // Nur Admins können öffentliche Übungen bearbeiten
        if (is_public && req.user.role !== 'admin') {
            is_public = 0;
        }
        
        db.run(
            `UPDATE exercises 
             SET name = ?, category = ?, muscle_group = ?, description = ?, 
                 instructions = ?, difficulty_level = ?, equipment = ?, is_public = ?
             WHERE id = ?`,
            [name, category, muscle_group, description, instructions, 
             difficulty_level || 1, equipment, is_public ? 1 : 0, exerciseId],
            function(dbErr) {
                if (dbErr) {
                    console.error('Übungs-Update-Fehler:', dbErr);
                    res.status(500).json({ error: 'Interner Serverfehler' });
                } else {
                    logSystemAction(req.user.id, 'EXERCISE_UPDATED', `Übung aktualisiert: ${name}`, req.ip, req.get('User-Agent'));
                    res.json({ message: 'Übung erfolgreich aktualisiert' });
                }
            }
        );
    });
});

/**
 * Übung löschen
 */
app.delete('/api/exercises/:id', authenticateToken, (req, res) => {
    const exerciseId = parseInt(req.params.id);
    
    // Berechtigung prüfen
    const checkPermissionSql = req.user.role === 'admin' 
        ? 'SELECT id, name, created_by FROM exercises WHERE id = ?'
        : 'SELECT id, name, created_by FROM exercises WHERE id = ? AND created_by = ?';
    
    const checkParams = req.user.role === 'admin' 
        ? [exerciseId] 
        : [exerciseId, req.user.id];
    
    db.get(checkPermissionSql, checkParams, (err, exercise) => {
        if (err) {
            console.error('Übungs-Lösch-Berechtigungs-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!exercise) {
            return res.status(404).json({ error: 'Übung nicht gefunden oder keine Berechtigung' });
        }
        
        // Prüfen ob Übung in Workouts verwendet wird
        db.get(
            'SELECT COUNT(*) as count FROM workout_exercises WHERE exercise_id = ?',
            [exerciseId],
            (countErr, result) => {
                if (countErr) {
                    console.error('Übungs-Verwendungs-Prüf-Fehler:', countErr);
                    return res.status(500).json({ error: 'Interner Serverfehler' });
                }
                
                if (result.count > 0) {
                    return res.status(409).json({ 
                        error: 'Übung kann nicht gelöscht werden, da sie in Trainings verwendet wird',
                        usageCount: result.count
                    });
                }
                
                // Übung löschen
                db.run('DELETE FROM exercises WHERE id = ?', [exerciseId], function(deleteErr) {
                    if (deleteErr) {
                        console.error('Übungs-Lösch-Fehler:', deleteErr);
                        res.status(500).json({ error: 'Interner Serverfehler' });
                    } else {
                        logSystemAction(req.user.id, 'EXERCISE_DELETED', `Übung gelöscht: ${exercise.name}`, req.ip, req.get('User-Agent'));
                        res.json({ message: 'Übung erfolgreich gelöscht' });
                    }
                });
            }
        );
    });
});

// ===== WORKOUT-ROUTEN =====

/**
 * Alle Workouts des Benutzers abrufen
 */
app.get('/api/workouts', authenticateToken, (req, res) => {
    const { limit = 50, offset = 0, date_from, date_to } = req.query;
    
    let sql = `
        SELECT w.*, 
               COUNT(we.id) as exercise_count,
               GROUP_CONCAT(e.name, ', ') as exercise_names
        FROM workouts w
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN exercises e ON we.exercise_id = e.id
        WHERE w.user_id = ?
    `;
    let params = [req.user.id];
    
    // Datumsfilter
    if (date_from) {
        sql += ' AND w.date >= ?';
        params.push(date_from);
    }
    
    if (date_to) {
        sql += ' AND w.date <= ?';
        params.push(date_to);
    }
    
    sql += ` 
        GROUP BY w.id
        ORDER BY w.date DESC, w.created_at DESC
        LIMIT ? OFFSET ?
    `;
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, workouts) => {
        if (err) {
            console.error('Workout-Abruf-Fehler:', err);
            res.status(500).json({ error: 'Interner Serverfehler' });
        } else {
            res.json(workouts);
        }
    });
});

/**
 * Einzelnes Workout mit Übungen abrufen
 */
app.get('/api/workouts/:id', authenticateToken, (req, res) => {
    const workoutId = parseInt(req.params.id);
    
    // Workout-Grunddaten
    db.get(
        'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
        [workoutId, req.user.id],
        (err, workout) => {
            if (err) {
                console.error('Workout-Detail-Fehler:', err);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            
            if (!workout) {
                return res.status(404).json({ error: 'Training nicht gefunden' });
            }
            
            // Workout-Übungen laden
            db.all(
                `SELECT we.*, e.name as exercise_name, e.category, e.muscle_group
                 FROM workout_exercises we
                 JOIN exercises e ON we.exercise_id = e.id
                 WHERE we.workout_id = ?
                 ORDER BY we.exercise_order ASC`,
                [workoutId],
                (exerciseErr, exercises) => {
                    if (exerciseErr) {
                        console.error('Workout-Übungs-Fehler:', exerciseErr);
                        return res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                    
                    // JSON-Felder parsen
                    exercises.forEach(exercise => {
                        try {
                            exercise.reps = exercise.reps ? JSON.parse(exercise.reps) : [];
                            exercise.weights = exercise.weights ? JSON.parse(exercise.weights) : [];
                        } catch (parseErr) {
                            console.warn('JSON-Parse-Fehler für Übung:', exercise.id, parseErr);
                            exercise.reps = [];
                            exercise.weights = [];
                        }
                    });
                    
                    workout.exercises = exercises;
                    res.json(workout);
                }
            );
        }
    );
});

/**
 * Neues Workout erstellen
 */
app.post('/api/workouts', authenticateToken, async (req, res) => {
    let { name, date, start_time, end_time, duration_minutes, notes, workout_type, location, rating, exercises } = req.body;
    
    // Input-Validierung
    if (!name || !date) {
        return res.status(400).json({ error: 'Name und Datum sind erforderlich' });
    }
    
    // Eingaben bereinigen
    name = sanitizeInput(name);
    notes = notes ? sanitizeInput(notes) : null;
    workout_type = workout_type || 'strength';
    location = location ? sanitizeInput(location) : null;
    
    // Validierungen
    if (name.length < 1 || name.length > 100) {
        return res.status(400).json({ error: 'Name muss zwischen 1 und 100 Zeichen lang sein' });
    }
    
    if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen' });
    }
    
    const validWorkoutTypes = ['strength', 'cardio', 'flexibility', 'sports', 'other'];
    if (!validWorkoutTypes.includes(workout_type)) {
        return res.status(400).json({ error: 'Ungültiger Trainingstyp' });
    }
    
    // Transaction für Workout + Übungen
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Workout erstellen
        db.run(
            `INSERT INTO workouts (user_id, name, date, start_time, end_time, duration_minutes, 
                                  notes, workout_type, location, rating)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name, date, start_time || null, end_time || null, 
             duration_minutes || null, notes, workout_type, location, rating || null],
            function(err) {
                if (err) {
                    console.error('Workout-Erstellungs-Fehler:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Interner Serverfehler' });
                }
                
                const workoutId = this.lastID;
                
                // Übungen hinzufügen falls vorhanden
                if (exercises && exercises.length > 0) {
                    let exerciseErrors = 0;
                    let exercisesProcessed = 0;
                    
                    exercises.forEach((exercise, index) => {
                        const { exercise_id, sets_count, reps, weights, distance, duration_seconds, rest_time, notes: exerciseNotes } = exercise;
                        
                        if (!exercise_id || !sets_count) {
                            exerciseErrors++;
                            exercisesProcessed++;
                            if (exercisesProcessed === exercises.length) {
                                if (exerciseErrors > 0) {
                                    db.run('ROLLBACK');
                                    return res.status(400).json({ error: 'Ungültige Übungsdaten' });
                                } else {
                                    db.run('COMMIT');
                                    logSystemAction(req.user.id, 'WORKOUT_CREATED', `Training erstellt: ${name}`, req.ip, req.get('User-Agent'));
                                    return res.status(201).json({ 
                                        message: 'Training erfolgreich erstellt',
                                        workoutId: workoutId
                                    });
                                }
                            }
                            return;
                        }
                        
                        db.run(
                            `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets_count, 
                                                           reps, weights, distance, duration_seconds, rest_time, notes)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [workoutId, exercise_id, index + 1, sets_count,
                             reps ? JSON.stringify(reps) : null,
                             weights ? JSON.stringify(weights) : null,
                             distance || null, duration_seconds || null,
                             rest_time || 90, exerciseNotes || null],
                            function(exerciseErr) {
                                if (exerciseErr) {
                                    console.error('Workout-Übungs-Fehler:', exerciseErr);
                                    exerciseErrors++;
                                }
                                
                                exercisesProcessed++;
                                
                                if (exercisesProcessed === exercises.length) {
                                    if (exerciseErrors > 0) {
                                        db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Fehler beim Hinzufügen der Übungen' });
                                    } else {
                                        db.run('COMMIT');
                                        logSystemAction(req.user.id, 'WORKOUT_CREATED', `Training erstellt: ${name}`, req.ip, req.get('User-Agent'));
                                        return res.status(201).json({ 
                                            message: 'Training erfolgreich erstellt',
                                            workoutId: workoutId
                                        });
                                    }
                                }
                            }
                        );
                    });
                } else {
                    // Kein Übungen, trotzdem commiten
                    db.run('COMMIT');
                    logSystemAction(req.user.id, 'WORKOUT_CREATED', `Training erstellt: ${name}`, req.ip, req.get('User-Agent'));
                    return res.status(201).json({ 
                        message: 'Training erfolgreich erstellt',
                        workoutId: workoutId
                    });
                }
            }
        );
    });
});

/**
 * Workout aktualisieren
 */
app.put('/api/workouts/:id', authenticateToken, (req, res) => {
    const workoutId = parseInt(req.params.id);
    let { name, date, start_time, end_time, duration_minutes, notes, workout_type, location, rating, exercises } = req.body;
    
    // Berechtigung prüfen
    db.get('SELECT id, name FROM workouts WHERE id = ? AND user_id = ?', [workoutId, req.user.id], (err, workout) => {
        if (err) {
            console.error('Workout-Update-Berechtigungs-Fehler:', err);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        
        if (!workout) {
            return res.status(404).json({ error: 'Training nicht gefunden' });
        }
        
        // Input-Validierung und -Bereinigung (gleich wie bei POST)
        if (!name || !date) {
            return res.status(400).json({ error: 'Name und Datum sind erforderlich' });
        }
        
        name = sanitizeInput(name);
        notes = notes ? sanitizeInput(notes) : null;
        workout_type = workout_type || 'strength';
        location = location ? sanitizeInput(location) : null;
        
        // Transaction für Update
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            // Workout-Grunddaten aktualisieren
            db.run(
                `UPDATE workouts 
                 SET name = ?, date = ?, start_time = ?, end_time = ?, duration_minutes = ?,
                     notes = ?, workout_type = ?, location = ?, rating = ?
                 WHERE id = ?`,
                [name, date, start_time || null, end_time || null, duration_minutes || null,
                 notes, workout_type, location, rating || null, workoutId],
                function(updateErr) {
                    if (updateErr) {
                        console.error('Workout-Update-Fehler:', updateErr);
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                    
                    // Alte Übungen löschen
                    db.run('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId], (deleteErr) => {
                        if (deleteErr) {
                            console.error('Workout-Übungs-Lösch-Fehler:', deleteErr);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Interner Serverfehler' });
                        }
                        
                        // Neue Übungen hinzufügen (gleiche Logik wie bei POST)
                        if (exercises && exercises.length > 0) {
                            let exerciseErrors = 0;
                            let exercisesProcessed = 0;
                            
                            exercises.forEach((exercise, index) => {
                                const { exercise_id, sets_count, reps, weights, distance, duration_seconds, rest_time, notes: exerciseNotes } = exercise;
                                
                                if (!exercise_id || !sets_count) {
                                    exerciseErrors++;
                                    exercisesProcessed++;
                                    if (exercisesProcessed === exercises.length) {
                                        if (exerciseErrors > 0) {
                                            db.run('ROLLBACK');
                                            return res.status(400).json({ error: 'Ungültige Übungsdaten' });
                                        } else {
                                            db.run('COMMIT');
                                            logSystemAction(req.user.id, 'WORKOUT_UPDATED', `Training aktualisiert: ${name}`, req.ip, req.get('User-Agent'));
                                            return res.json({ message: 'Training erfolgreich aktualisiert' });
                                        }
                                    }
                                    return;
                                }
                                
                                db.run(
                                    `INSERT INTO workout_exercises (workout_i            ['Beinpresse', 'Krafttraining', 'Beine', 'Maschinenübung für Quadrizeps und Gesäß', 'Plattform mit den Beinen kontrolliert wegdrücken', 2, 'Beinpresse'],
            ['Ausfallschritte', 'Krafttraining', 'Beine', 'Unilaterale Beinübung für Balance und Kraft', 'Großen Schritt nach vorn, Knie beugen und zurück zur Ausgangsposition', 2, 'Kurzhanteln'],
            ['Beincurls', 'Krafttraining', 'Beine', 'Isolationsübung für die Beinbeuger', 'Liegend oder sitzend Fersen zum Gesäß führen', 1, 'Beincurl-Maschine'],
            ['Beinstrecker', 'Krafttraining', 'Beine', 'Isolationsübung für den Quadrizeps', 'Sitzend Unterschenkel kontrolliert strecken', 1, 'Beinstrecker-Maschine'],
            ['Wadenheben', 'Krafttraining', 'Beine', 'Übung für die Wadenmuskulatur', 'Auf Zehenspitzen stellen und kontrolliert senken', 1, 'Kurzhanteln'],
            ['Bulgarische Split Squats', 'Krafttraining', 'Beine', 'Einbeinige Kniebeugen für intensive Belastung', 'Hinteres Bein erhöht, einbeinige Kniebeuge ausführen', 3, 'Bank, Kurzhanteln'],

            // Schulter-Übungen
            ['Schulterdrücken', 'Krafttraining', 'Schultern', 'Grundübung für die Schultermuskulatur', 'Hantel oder Langhantel über den Kopf drücken', 2, 'Langhantel/Kurzhanteln'],
            ['Seitheben', 'Krafttraining', 'Schultern', 'Isolationsübung für die seitliche Schulter', 'Kurzhanteln seitlich bis Schulterhöhe heben', 2, 'Kurzhanteln'],
            ['Frontheben', 'Krafttraining', 'Schultern', 'Isolationsübung für die vordere Schulter', 'Kurzhanteln nach vorn bis Schulterhöhe heben', 2, 'Kurzhanteln'],
            ['Reverse Flys', 'Krafttraining', 'Schultern', 'Übung für die hintere Schulter', 'Gebeugt stehend Arme nach hinten führen', 2, 'Kurzhanteln'],
            ['Aufrechtes Rudern', 'Krafttraining', 'Schultern', 'Komplexübung für Schultern und Nacken', 'Langhantel aufrecht zum Kinn ziehen', 3, 'Langhantel'],
            ['Arnold Press', 'Krafttraining', 'Schultern', 'Variante des Schulterdrückens mit Rotation', 'Schulterdrücken mit 180°-Rotation der Handgelenke', 3, 'Kurzhanteln'],

            // Arm-Übungen
            ['Bizeps Curls', 'Krafttraining', 'Arme', 'Isolationsübung für den Bizeps', 'Hantel kontrolliert zum Körper führen, nur Unterarm bewegen', 1, 'Kurzhanteln'],
            ['Hammer Curls', 'Krafttraining', 'Arme', 'Bizeps-Variation mit neutralem Griff', 'Kurzhanteln mit neutralem Griff heben', 1, 'Kurzhanteln'],
            ['Trizeps Dips', 'Krafttraining', 'Arme', 'Körpergewichtsübung für den Trizeps', 'Körper an Stangen oder Bank nach unten und oben bewegen', 2, 'Dip-Stangen/Bank'],
            ['Trizepsdrücken', 'Krafttraining', 'Arme', 'Isolationsübung für den Trizeps', 'Hantel oder Kabel über Kopf nach unten drücken', 2, 'Kurzhanteln/Kabel'],
            ['Enge Liegestütze', 'Krafttraining', 'Arme', 'Trizeps-fokussierte Liegestütze', 'Hände eng zusammen, Fokus auf Trizeps-Aktivierung', 2, 'Körpergewicht'],
            ['21er Curls', 'Krafttraining', 'Arme', 'Intensive Bizeps-Übung in drei Phasen', '7 halbe Wiederholungen unten, 7 halbe oben, 7 volle', 3, 'Langhantel'],

            // Core-Übungen
            ['Plank', 'Krafttraining', 'Core', 'Statische Übung für die Rumpfmuskulatur', 'In Liegestützposition halten, Körperspannung aufrechterhalten', 1, 'Körpergewicht'],
            ['Crunches', 'Krafttraining', 'Core', 'Grundübung für die Bauchmuskulatur', 'Oberkörper kontrolliert zu den Knien führen', 1, 'Körpergewicht'],
            ['Russian Twists', 'Krafttraining', 'Core', 'Übung für die seitlichen Bauchmuskeln', 'Sitzend Oberkörper seitlich rotieren', 2, 'Medizinball'],
            ['Mountain Climbers', 'Krafttraining', 'Core', 'Dynamische Core-Übung mit Cardio-Element', 'Aus Plank-Position Knie abwechselnd zur Brust', 2, 'Körpergewicht'],
            ['Dead Bug', 'Krafttraining', 'Core', 'Core-Stabilisation in Rückenlage', 'Rückenlage, gegenläufige Arm-Bein-Bewegung', 2, 'Körpergewicht'],
            ['Hanging Leg Raises', 'Krafttraining', 'Core', 'Übung für untere Bauchmuskeln', 'An Stange hängend Beine kontrolliert heben', 3, 'Klimmzugstange'],

            // Cardio-Übungen
            ['Laufband', 'Cardio', 'Cardio', 'Klassisches Ausdauertraining', 'Gleichmäßiges oder intervallartiges Laufen', 1, 'Laufband'],
            ['Fahrrad', 'Cardio', 'Cardio', 'Gelenkschonendes Ausdauertraining', 'Cardio-Training auf dem Ergometer', 1, 'Ergometer'],
            ['Ellipsentrainer', 'Cardio', 'Cardio', 'Ganzkörper-Cardio gelenkschonend', 'Ganzkörper-Cardio-Training ohne Gelenkbelastung', 1, 'Ellipsentrainer'],
            ['Rudergerät', 'Cardio', 'Cardio', 'Ganzkörper-Cardio mit Kraftkomponente', 'Ruder-Bewegung für Ausdauer und Kraftausdauer', 2, 'Rudergerät'],
            ['Stepper', 'Cardio', 'Cardio', 'Step-Cardio für Beine und Po', 'Treppen-Simulation für Beine und Cardio', 1, 'Stepper'],
            ['Springseil', 'Cardio', 'Cardio', 'Hochintensives Cardio-Training', 'Koordination und Ausdauer durch Seilspringen', 2, 'Springseil'],

            // Functional Training
            ['Burpees', 'Functional', 'Ganzkörper', 'Explosive Ganzkörperübung', 'Kombination aus Liegestütz, Sprung und Streckung', 3, 'Körpergewicht'],
            ['Kettlebell Swings', 'Functional', 'Ganzkörper', 'Explosive Hüftbewegung mit Kettlebell', 'Kettlebell zwischen den Beinen schwingen, explosive Hüftstreckung', 3, 'Kettlebell'],
            ['Thrusters', 'Functional', 'Ganzkörper', 'Kombination aus Kniebeuge und Schulterdrücken', 'Kniebeuge nahtlos in Schulterdrücken überführen', 3, 'Kurzhanteln'],
            ['Turkish Get-Up', 'Functional', 'Ganzkörper', 'Komplexe Ganzkörperbewegung', 'Vom Liegen zum Stehen mit Gewicht über Kopf', 4, 'Kettlebell'],
            ['Box Jumps', 'Functional', 'Beine', 'Explosive Sprungkraft-Übung', 'Auf erhöhte Plattform springen, kontrolliert absteigen', 2, 'Sprungbox'],
            ['Battle Ropes', 'Functional', 'Ganzkörper', 'Hochintensives Seil-Training', 'Seile in verschiedenen Mustern schwingen', 3, 'Battle Ropes'],

            // Stretching/Mobility
            ['Katze-Kuh Stretch', 'Stretching', 'Rücken', 'Mobilisation der Wirbelsäule', 'Vierfüßlerstand, Wirbelsäule abwechselnd runden und strecken', 1, 'Körpergewicht'],
            ['Kinderpose', 'Stretching', 'Rücken', 'Entspannungsposition für Rücken', 'Kniend nach hinten setzen, Arme weit ausstrecken', 1, 'Körpergewicht'],
            ['Piriformis Stretch', 'Stretching', 'Beine', 'Dehnung des Piriformis-Muskels', 'Liegend Bein über andere Seite kreuzen und ziehen', 1, 'Körpergewicht'],
            ['Shoulder Rolls', 'Stretching', 'Schultern', 'Schulter-Mobilisation', 'Schultern in kreisenden Bewegungen vor und zurück', 1, 'Körpergewicht'],
            ['Hip Circles', 'Stretching', 'Beine', 'Hüft-Mobilisation', 'Hüfte in großen kreisenden Bewegungen', 1, 'Körpergewicht'],
            ['Cobra Stretch', 'Stretching', 'Rücken', 'Rückenstreckung und Brust-Öffnung', 'Bauchlage, Oberkörper mit Armen nach oben drücken', 1, 'Körpergewicht']
        ];
        
        db.get('SELECT COUNT(*) as count FROM exercises', (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (result.count === 0) {
                const stmt = db.prepare(`
                    INSERT INTO exercises (name, category, muscle_group, description, instructions, difficulty_level, equipment) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                
                let completed = 0;
                const errors = [];
                
                exercises.forEach(exercise => {
                    stmt.run(exercise, (err) => {
                        if (err) errors.push(err);
                        completed++;
                        
                        if (completed === exercises.length) {
                            stmt.finalize((err) => {
                                if (err || errors.length > 0) {
                                    reject(err || errors[0]);
                                } else {
                                    console.log(`✅ ${exercises.length} Standard-Übungen eingefügt`);
                                    resolve();
                                }
                            });
                        }
                    });
                });
            } else {
                console.log('✅ Standard-Übungen bereits vorhanden');
                resolve();
            }
        });
    });
}

/**
 * Trigger für automatische Timestamp-Updates erstellen
 */
db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_exercises_timestamp 
    AFTER UPDATE ON exercises
    BEGIN
        UPDATE exercises SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_workouts_timestamp 
    AFTER UPDATE ON workouts
    BEGIN
        UPDATE workouts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp 
    AFTER UPDATE ON user_preferences
    BEGIN
        UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_workout_templates_timestamp 
    AFTER UPDATE ON workout_templates
    BEGIN
        UPDATE workout_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
`);

/**
 * Hilfsfunktion für System-Logging
 * @param {number} userId Benutzer-ID (optional)
 * @param {string} action Durchgeführte Aktion
 * @param {string} details Details zur Aktion
 * @param {string} ipAddress IP-Adresse
 * @param {string} userAgent User-Agent
 */
function logSystemAction(userId, action, details, ipAddress, userAgent) {
    db.run(
        'INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [userId || null, action, details || null, ipAddress || null, userAgent || null],
        (err) => {
            if (err) {
                console.error('Logging-Fehler:', err);
            }
        }
    );
}

/**
 * JWT-Middleware für Authentifizierung
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Kein Authentifizierungstoken bereitgestellt' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT-Verifizierung fehlgeschlagen:', err);
            logSystemAction(null, 'AUTH_FAILED', `Ungültiger Token: ${err.message}`, req.ip, req.get('User-Agent'));
            return res.status(403).json({ error: 'Ungültiger oder abgelaufener Token' });
        }
        
        // Benutzer-Existenz und Aktivität prüfen
        db.get('SELECT id, username, role, is_active FROM users WHERE id = ?', [user.id], (dbErr, dbUser) => {
            if (dbErr) {
                console.error('Datenbankfehler bei Token-Verifizierung:', dbErr);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            
            if (!dbUser) {
                return res.status(401).json({ error: 'Benutzer nicht gefunden' });
            }
            
            if (!dbUser.is_active) {
                return res.status(401).json({ error: 'Benutzerkonto ist deaktiviert' });
            }
            
            req.user = dbUser;
            next();
        });
    });
}

/**
 * Admin-Middleware - prüft Admin-Berechtigung
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        logSystemAction(req.user?.id, 'ADMIN_ACCESS_DENIED', `Versuch auf Admin-Bereich: ${req.path}`, req.ip, req.get('User-Agent'));
        return res.status(403).json({ error: 'Admin-Zugriff erforderlich' });
    }
    next();
}

/**
 * Validierungs-Hilfsfunktionen
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6 && password.length <= 128;
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
}

// ===== AUTHENTIFIZIERUNGS-ROUTEN =====

/**
 * Login-Route mit erweiterten Sicherheitsfeatures
 */
app.post('/api/auth/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
        }
        
        // Benutzer suchen (Username oder Email)
        db.get(
            `SELECT * FROM users 
             WHERE (username = ? OR email = ?) 
             AND is_active = 1`,
            [username.trim(), username.trim()],
            async (err, user) => {
                if (err) {
                    console.error('Login-Datenbankfehler:', err);
                    return res.status(500).json({ error: 'Interner Serverfehler' });
                }
                
                if (!user) {
                    logSystemAction(null, 'LOGIN_FAILED', `Benutzer nicht gefunden: ${username}`, req.ip, req.get('User-Agent'));
                    return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
                }
                
                // Account-Sperrung prüfen
                if (user.locked_until && new Date() < new Date(user.locked_until)) {
                    const lockTime = new Date(user.locked_until).toLocaleString('de-DE');
                    return res.status(423).json({ 
                        error: `Konto gesperrt bis ${lockTime}`,
                        lockedUntil: user.locked_until
                    });
                }
                
                try {
                    const validPassword = await bcrypt.compare(password, user.password_hash);
                    
                    if (!validPassword) {
                        // Fehlgeschlagene Login-Versuche erhöhen
                        const failedAttempts = (user.failed_login_attempts || 0) + 1;
                        let lockedUntil = null;
                        
                        // Nach 5 Fehlversuchen für 30 Minuten sperren
                        if (failedAttempts >= 5) {
                            lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                        }
                        
                        db.run(
                            'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
                            [failedAttempts, lockedUntil, user.id]
                        );
                        
                        logSystemAction(user.id, 'LOGIN_FAILED', `Falsches Passwort, Versuch ${failedAttempts}`, req.ip, req.get('User-Agent'));
                        
                        if (lockedUntil) {
                            return res.status(423).json({ 
                                error: 'Zu viele Fehlversuche. Konto für 30 Minuten gesperrt.',
                                lockedUntil: lockedUntil
                            });
                        }
                        
                        return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
                    }
                    
                    // Erfolgreicher Login - Zähler zurücksetzen
                    db.run(
                        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                        [user.id]
                    );
                    
                    // JWT Token erstellen
                    const tokenPayload = {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        email: user.email
                    };
                    
                    const token = jwt.sign(tokenPayload, JWT_SECRET, { 
                        expiresIn: process.env.SESSION_TIMEOUT || '24h',
                        issuer: 'gym-tracker',
                        audience: 'gym-tracker-users'
                    });
                    
                    logSystemAction(user.id, 'LOGIN_SUCCESS', null, req.ip, req.get('User-Agent'));
                    
                    res.json({
                        token,
                        expiresIn: process.env.SESSION_TIMEOUT || '24h',
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            last_login: user.last_login
                        }
                    });
                } catch (bcryptError) {
                    console.error('Bcrypt-Fehler:', bcryptError);
                    res.status(500).json({ error: 'Interner Serverfehler' });
                }
            }
        );
    } catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Registrierungs-Route mit erweiterter Validierung
 */
app.post('/api/auth/register', rateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
        let { username, email, password, first_name, last_name, date_of_birth } = req.body;
        
        // Input-Validierung
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Benutzername, E-Mail und Passwort sind erforderlich' });
        }
        
        // Eingaben bereinigen
        username = sanitizeInput(username);
        email = sanitizeInput(email.toLowerCase());
        first_name = first_name ? sanitizeInput(first_name) : null;
        last_name = last_name ? sanitizeInput(last_name) : null;
        
        // Validierungen
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Benutzername muss zwischen 3 und 50 Zeichen lang sein' });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Ungültiges E-Mail-Format' });
        }
        
        if (!validatePassword(password)) {
            return res.status(400).json({ error: 'Passwort muss zwischen 6 und 128 Zeichen lang sein' });
        }
        
        // Datum validieren falls angegeben
        if (date_of_birth) {
            const birthDate = new Date(date_of_birth);
            const now = new Date();
            const age = now.getFullYear() - birthDate.getFullYear();
            
            if (age < 13 || age > 120) {
                return res.status(400).json({ error: 'Ungültiges Geburtsdatum' });
            }
        }
        
        // Passwort hashen
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Benutzer erstellen
        db.run(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, date_of_birth) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, first_name, last_name, date_of_birth || null],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        if (err.message.includes('username')) {
                            res.status(409).json({ error: 'Benutzername bereits vorhanden' });
                        } else if (err.message.includes('email')) {
                            res.status(409).json({ error: 'E-Mail bereits vorhanden' });
                        } else {
                            res.status(409).json({ error: 'Benutzername oder E-Mail bereits vorhanden' });
                        }
                    } else {
                        console.error('Registrierungsfehler:', err);
                        res.status(500).json({ error: 'Interner Serverfehler' });
                    }
                } else {
                    const userId = this.lastID;
                    
                    // Standard-Einstellungen erstellen
                    db.run(
                        'INSERT INTO user_preferences (user_id) VALUES (?)',
                        [userId],
                        (prefErr) => {
                            if (prefErr) {
                                console.warn('Fehler beim Erstellen der Benutzereinstellungen:', prefErr);
                            }
                        }
                    );
                    
                    logSystemAction(userId, 'USER_REGISTERED', `Neuer Benutzer: ${username}`, req.ip, req.get('User-Agent'));
                    console.log(`Neuer Benutzer registriert: ${username} (${email})`);
                    
                    res.status(201).json({ 
                        message: 'Benutzer erfolgreich erstellt', 
                        userId: userId
                    });
                }
            }
        );
    } catch (error) {
        console.error('Registrierungsfehler:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});

/**
 * Token-Refresh-Route
 */
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
    const tokenPayload = {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        email: req.user.email
    };
    
    const newToken = jwt.sign(tokenPayload, JWT_SECRET, { 
        expiresIn: process.env.SESSION_TIMEOUT || '24h',
        issuer: 'gym-tracker',
        audience: 'gym-tracker-users'
    });
    
    res.json({
        token: newToken,
        expiresIn: process.env.SESSION_TIMEOUT || '24h'
    });
});

/**
 * Logout-Route (für Logging)
 */
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    logSystemAction(req.user.id, 'LOGOUT', null, req.ip, req.get('User-Agent'));
    res.json({ message: 'Erfolgreich abgemeldet' });
});

// ===== BENUTZER-PROFIL-ROUTEN =====

/**
 * Benutzerprofil abrufen
 */
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get(
        `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name, 
                u.date_of_birth, u.created_at, u.last_login,
                p.preferred_units, p.default_rest_time, p.theme, p.language
         FROM users u
         LEFT JOIN user_preferences p ON u.id = p.user_id
         WHERE u.id = ?`,
        [req.user.id],
        (err, user) => {
            if (err) {
                console.error('Profil-Abruf-Fehler:', err);
                res.status(500).json({ error: 'Interner Serverfehler' });
            } else if (!user) {
                res.status(404).json({ error: 'Benutzer nicht gefunden' });
            } else {
                res.json(user);
            }
        }
    );
});

/**
 * Benutzerprofil aktualisieren
 */
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        let { username, email, first_name, last_name, date_of_birth } = req.body;
        
        // Input-Validierung und -Bereinigung
        if (!username || !email) {
            return res.status(400).json({ error: 'Benutzername und E-Mail sind erforderlich' });
        }
        
        username = sanitizeInput(username);
        email = sanitizeInput(email.toLowerCase());
        first_name = first_name ? sanitizeInput(first_name) : null;
        last_name = last_name ? sanitizeInput(last_name) : null;
        
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Benutzername muss zwischen 3 und 50 Zeichen lang sein' });
        }
        
        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Ungültiges E-Mail-Format' });
        }
        
        // Datum validieren falls angegeben
        if (date_of_birth) {
            const birthDate = new Date(date_of_birth);
            const now = new Date();
            const age = now.getFullYear() - birthDate.getFullYear();
            
            if (age < 13 || age > 120) {
                return res.status(400).json({ error: 'Ungültiges Geburtsdatum' });
            }
        }
        
        db.run(
            `UPDATE users 
             SET username = ?, email = ?, first_name = ?, last_name = ?, date_of_birth = ?
             WHERE id = ?`,
            [username, email, first_name, last_name, date_of_birth || null, req.user.id],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        if (err.message.includes('username')) {
                            res.status(409).json({ error: 'Benutzername bereits vorhanden' });
                        } else if (err.message.includes('email// Gym Tracker Server - Vollständige Express.js Implementation
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'gym_tracker.db');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware-Konfiguration
app.use(cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Request-Logging-Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// Rate-Limiting-Middleware (einfache Implementierung)
const rateLimitMap = new Map();
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const clientIP = req.ip;
        const now = Date.now();
        
        if (!rateLimitMap.has(clientIP)) {
            rateLimitMap.set(clientIP, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const clientData = rateLimitMap.get(clientIP);
        
        if (now > clientData.resetTime) {
            clientData.count = 1;
            clientData.resetTime = now + windowMs;
            return next();
        }
        
        if (clientData.count >= maxRequests) {
            return res.status(429).json({ 
                error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
                retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
            });
        }
        
        clientData.count++;
        next();
    };
};

// Rate-Limiting auf API-Routen anwenden
app.use('/api', rateLimit(200, 15 * 60 * 1000)); // 200 Requests pro 15 Minuten

/**
 * SQLite-Datenbank initialisieren
 * Stellt Verbindung zur Datenbank her und aktiviert wichtige Pragmas
 */
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Datenbankfehler:', err.message);
        process.exit(1);
    }
    console.log('✅ Mit SQLite-Datenbank verbunden');
    initDatabase();
});

// Wichtige SQLite-Konfigurationen
db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 1000;
    PRAGMA temp_store = memory;
    PRAGMA mmap_size = 268435456;
`);

/**
 * Initialisiert die Datenbank mit Tabellen und Standarddaten
 */
async function initDatabase() {
    try {
        await createTables();
        await createDefaultAdmin();
        await insertDefaultExercises();
        await createIndexes();
        console.log('✅ Datenbank-Initialisierung abgeschlossen');
    } catch (error) {
        console.error('❌ Datenbank-Initialisierung fehlgeschlagen:', error);
        process.exit(1);
    }
}

/**
 * Erstellt alle benötigten Datenbanktabellen
 * Definiert vollständiges Schema für Gym Tracker
 */
function createTables() {
    return new Promise((resolve, reject) => {
        const tables = [
            // Benutzertabelle mit erweiterten Feldern
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                date_of_birth DATE,
                is_active BOOLEAN DEFAULT 1,
                last_login DATETIME,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Übungstabelle mit vollständigen Metadaten
            `CREATE TABLE IF NOT EXISTS exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                muscle_group VARCHAR(50) NOT NULL,
                description TEXT,
                instructions TEXT,
                difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
                equipment VARCHAR(100),
                is_public BOOLEAN DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )`,
            
            // Trainingstabelle mit erweiterten Feldern
            `CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                start_time TIME,
                end_time TIME,
                duration_minutes INTEGER,
                notes TEXT,
                workout_type VARCHAR(50) DEFAULT 'strength',
                location VARCHAR(100),
                rating INTEGER CHECK (rating BETWEEN 1 AND 5),
                calories_burned INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Trainingsübungen-Tabelle (Many-to-Many)
            `CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                exercise_order INTEGER DEFAULT 1,
                sets_count INTEGER NOT NULL DEFAULT 1,
                reps TEXT, -- JSON Array: [12, 10, 8]
                weights TEXT, -- JSON Array: [50, 55, 60]
                distance REAL, -- Für Cardio-Übungen (km)
                duration_seconds INTEGER, -- Für Zeit-basierte Übungen
                rest_time INTEGER DEFAULT 90, -- Pausenzeit in Sekunden
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`,
            
            // Benutzereinstellungen
            `CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                preferred_units VARCHAR(10) DEFAULT 'metric', -- metric oder imperial
                default_rest_time INTEGER DEFAULT 90,
                theme VARCHAR(20) DEFAULT 'light',
                language VARCHAR(10) DEFAULT 'de',
                privacy_settings TEXT, -- JSON Object
                notification_settings TEXT, -- JSON Object
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Körpermessungen für Fortschrittsverfolgung
            `CREATE TABLE IF NOT EXISTS body_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                measurement_date DATE NOT NULL,
                weight REAL, -- kg
                body_fat_percentage REAL,
                muscle_mass REAL, -- kg
                height REAL, -- cm
                chest REAL, -- cm
                waist REAL, -- cm
                hips REAL, -- cm
                bicep_left REAL, -- cm
                bicep_right REAL, -- cm
                thigh_left REAL, -- cm
                thigh_right REAL, -- cm
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Persönliche Rekorde
            `CREATE TABLE IF NOT EXISTS personal_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                record_type VARCHAR(20) NOT NULL, -- '1RM', 'volume', 'reps', 'time'
                value REAL NOT NULL,
                unit VARCHAR(10), -- 'kg', 'lbs', 'seconds', 'minutes'
                reps INTEGER,
                date_achieved DATE NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
                UNIQUE(user_id, exercise_id, record_type)
            )`,
            
            // Workout-Vorlagen
            `CREATE TABLE IF NOT EXISTS workout_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                estimated_duration INTEGER, -- Minuten
                difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
                is_public BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,
            
            // Template-Übungen
            `CREATE TABLE IF NOT EXISTS template_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                exercise_id INTEGER NOT NULL,
                exercise_order INTEGER DEFAULT 1,
                suggested_sets INTEGER DEFAULT 3,
                suggested_reps TEXT, -- JSON Array
                suggested_weight REAL,
                suggested_rest_time INTEGER,
                notes TEXT,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )`,
            
            // System-Logs für Audit
            `CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action VARCHAR(100) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`
        ];
        
        let completed = 0;
        const errors = [];
        
        tables.forEach((sql, index) => {
            db.exec(sql, (err) => {
                if (err) {
                    console.error(`Fehler beim Erstellen von Tabelle ${index}:`, err);
                    errors.push(err);
                }
                completed++;
                
                if (completed === tables.length) {
                    if (errors.length > 0) {
                        reject(new Error(`Fehler beim Erstellen von ${errors.length} Tabellen`));
                    } else {
                        console.log('✅ Datenbankschema erfolgreich erstellt');
                        resolve();
                    }
                }
            });
        });
    });
}

/**
 * Erstellt Datenbankindizes für bessere Performance
 */
function createIndexes() {
    return new Promise((resolve, reject) => {
        const indexes = [
            // Benutzer-Indizes
            'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
            
            // Übungs-Indizes
            'CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category)',
            'CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group)',
            'CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name)',
            'CREATE INDEX IF NOT EXISTS idx_exercises_public ON exercises(is_public)',
            
            // Workout-Indizes
            'CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date)',
            'CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date)',
            'CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(workout_type)',
            
            // Workout-Exercise-Indizes
            'CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id)',
            'CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id)',
            'CREATE INDEX IF NOT EXISTS idx_workout_exercises_order ON workout_exercises(workout_id, exercise_order)',
            
            // Measurements-Indizes
            'CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measurement_date)',
            
            // Records-Indizes
            'CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_id)',
            'CREATE INDEX IF NOT EXISTS idx_personal_records_type ON personal_records(record_type)',
            
            // Template-Indizes
            'CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_workout_templates_public ON workout_templates(is_public)',
            
            // Log-Indizes
            'CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_system_logs_action ON system_logs(action)',
            'CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at)'
        ];
        
        let completed = 0;
        const errors = [];
        
        indexes.forEach((sql, index) => {
            db.exec(sql, (err) => {
                if (err) {
                    console.error(`Fehler beim Erstellen von Index ${index}:`, err);
                    errors.push(err);
                }
                completed++;
                
                if (completed === indexes.length) {
                    if (errors.length > 0) {
                        console.warn(`⚠️ ${errors.length} Index-Fehler aufgetreten`);
                    } else {
                        console.log('✅ Datenbankindizes erfolgreich erstellt');
                    }
                    resolve();
                }
            });
        });
    });
}

/**
 * Erstellt Standard-Admin-Benutzer falls nicht vorhanden
 */
async function createDefaultAdmin() {
    return new Promise(async (resolve, reject) => {
        db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, user) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (!user) {
                try {
                    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
                    const hashedPassword = await bcrypt.hash(adminPassword, 12);
                    
                    db.run(
                        'INSERT INTO users (username, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                            'admin', 
                            process.env.ADMIN_EMAIL || 'admin@gym.zhst.eu', 
                            hashedPassword, 
                            'admin', 
                            'Admin', 
                            'User'
                        ],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                console.log(`✅ Standard-Admin erstellt: admin/${adminPassword}`);
                                resolve();
                            }
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            } else {
                console.log('✅ Standard-Admin bereits vorhanden');
                resolve();
            }
        });
    });
}

/**
 * Fügt umfangreiche Standard-Übungen ein
 */
function insertDefaultExercises() {
    return new Promise((resolve, reject) => {
        const exercises = [
            // Brust-Übungen
            ['Bankdrücken', 'Krafttraining', 'Brust', 'Grundübung für die Brustmuskulatur', 'Flach auf Bank legen, Langhantel greifen, kontrolliert zur Brust führen und wieder hochdrücken', 3, 'Langhantel, Bank'],
            ['Schrägbankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken auf der Schrägbank für obere Brust', 'Bank auf 30-45° einstellen, Langhantel kontrolliert zur oberen Brust führen', 3, 'Langhantel, Schrägbank'],
            ['Kurzhantel Bankdrücken', 'Krafttraining', 'Brust', 'Bankdrücken mit Kurzhanteln für größeren Bewegungsumfang', 'Mit Kurzhanteln beidseits der Brust, kontrolliert nach oben drücken', 2, 'Kurzhanteln, Bank'],
            ['Fliegende', 'Krafttraining', 'Brust', 'Isolationsübung für die Brustmuskulatur', 'Mit Kurzhanteln bogenförmige Bewegung zur Brustmitte ausführen', 2, 'Kurzhanteln, Bank'],
            ['Liegestütze', 'Krafttraining', 'Brust', 'Körpergewichtsübung für Brust und Arme', 'Körperspannung halten, kontrolliert nach unten und oben bewegen', 1, 'Körpergewicht'],
            ['Dips', 'Krafttraining', 'Brust', 'Körpergewichtsübung für untere Brust und Trizeps', 'An parallelen Stangen Körper absenken und wieder hochdrücken', 3, 'Dip-Stangen'],

            // Rücken-Übungen
            ['Kreuzheben', 'Krafttraining', 'Rücken', 'Grundübung für den gesamten Körper', 'Langhantel vom Boden mit geradem Rücken kontrolliert nach oben ziehen', 4, 'Langhantel'],
            ['Klimmzüge', 'Krafttraining', 'Rücken', 'Übung für Latissimus und Bizeps', 'An der Stange hängen und sich kontrolliert nach oben ziehen', 3, 'Klimmzugstange'],
            ['Langhantelrudern', 'Krafttraining', 'Rücken', 'Horizontales Ziehen für den mittleren Rücken', 'Langhantel horizontal zum Körper ziehen, Ellbogen nah am Körper', 3, 'Langhantel'],
            ['Kurzhantelrudern', 'Krafttraining', 'Rücken', 'Einarmiges Rudern mit Kurzhantel', 'Einseitig mit Abstützung auf Bank, Kurzhantel zum Körper ziehen', 2, 'Kurzhantel, Bank'],
            ['Latzug', 'Krafttraining', 'Rücken', 'Vertikales Ziehen am Kabelzug', 'Griff über Kopf nach unten zur Brust ziehen', 2, 'Latzugmaschine'],
            ['T-Bar Rudern', 'Krafttraining', 'Rücken', 'Rudern mit T-Bar für mittleren Rücken', 'T-Bar mit beiden Händen greifen und zum Körper ziehen', 3, 'T-Bar'],

            // Bein-Übungen
            ['Kniebeugen', 'Krafttraining', 'Beine', 'Grundübung für die Beinmuskulatur', 'Aufrecht stehen, kontrolliert in die Hocke gehen und wieder aufrichten', 2, 'Langhantel, Squat Rack'],
            ['Bein