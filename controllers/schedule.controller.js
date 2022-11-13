const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const Pool = require('pg').Pool;

const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
});

const getScheduleByUser = (request, response) => {
    let { usuario_id } = request.params;

    pool.query('SELECT * FROM schedules WHERE usuario_id = $1 ORDER BY day_of_week, time_of_day',
               [usuario_id],
               async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Este usuario no tiene horarios de publicación."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const createSchedule = async (request, response) => {
    let { userId, dayOfWeek, timeOfDay } = request.body;

    pool.query('INSERT INTO schedules (usuario_id, day_of_week, time_of_day) VALUES ($1, $2, $3)',
               [userId, dayOfWeek, timeOfDay],
               (error, results) => {
        
        if (error) {
            throw error
        }

        response.status(StatusCodes.CREATED).json({
            message: ReasonPhrases.CREATED,
            data: "Nuevo horario de publicación creado."
        });
    });
}

const updateSchedule = (request, response) => {
    const id = parseInt(request.params.id);
    const { dayOfWeek, timeOfDay } = request.body;

    pool.query('UPDATE schedules SET day_of_week = $1, time_of_day = $2 WHERE id = $3',
               [dayOfWeek, timeOfDay, id],
               (error, results) => {
            
        if (error) {
            throw error
        }

        response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: "Horario de publicación actualizado."
        });
    });
}

const deleteSchedule = (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('DELETE FROM schedules WHERE id = $1',
               [id],
               (error, results) => {
        
        if (error) {
            throw error
        }

        response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: "Horario de publicación eliminado."
        });
    });
}

module.exports = {
    getScheduleByUser,
    createSchedule,
    updateSchedule,
    deleteSchedule
}
