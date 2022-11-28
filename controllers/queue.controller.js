const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const Pool = require('pg').Pool;

const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
});

const getPostsInCola = (request, response) => {
    pool.query('SELECT * FROM posts WHERE tipo = \'cola\' AND fecha_publicacion IS NULL ORDER BY fecha_creacion',
               async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "No existen posts en cola."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const getPostsByUserInCola = (request, response) => {
    let { usuario_id } = request.params;

    pool.query('SELECT * FROM posts WHERE usuario_id = $1 AND tipo = \'cola\' AND fecha_publicacion IS NULL ORDER BY fecha_creacion',
               [usuario_id],
               async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Este usuario no tiene posts en cola."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const getSchedules = (request, response) => {
    pool.query('SELECT * FROM schedules ORDER BY day_of_week, time_of_day',
            async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "No hay horarios de publicación."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const getSchedulesByDay = (request, response) => {
    let date = new Date();
    console.log(date.getDay());

    pool.query('SELECT * FROM schedules WHERE day_of_week = $1 ORDER BY day_of_week, time_of_day',
            [date.getDay()],
            async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "No hay horarios de publicación."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const getSchedulesAndPostsByUserAndDayAndTime = async () => {
    let date = new Date();
    let hour = date.getHours();
    let minutes = date.getMinutes();
    if (hour < 10) {
        hour = '0' + hour;        
    }
    if (minutes < 10) {
        minutes = '0' + minutes;        
    }
    let time = '08:05:00';

    const { rows } = await pool.query('SELECT u.id, s.day_of_week, s.time_of_day, p.plataforma, p.texto FROM usuarios AS u JOIN schedules AS s ON u.id = s.usuario_id JOIN posts AS p ON u.id = p.usuario_id WHERE p.fecha_publicacion IS NULL AND p.tipo = \'cola\' AND s.day_of_week = $1 AND s.time_of_day = $2', [date.getDay(), time]);

    rows.forEach(row => {
        console.log(row);
    });
}

function intervalFunc() {
    let date = new Date();
    let hour = date.getHours();
    let minutes = date.getMinutes();
    if (hour < 10) {
        hour = '0' + hour;        
    }
    if (minutes < 10) {
        minutes = '0' + minutes;        
    }
    let time = hour + ':' + minutes + ':00';

    if ( date.getSeconds() === 0 ) {
        console.log(time);
    }
    getSchedulesAndPostsByUserAndDayAndTime();
}
setInterval(intervalFunc, 1000);

module.exports = {
    getPostsInCola,
    getPostsByUserInCola,
    getSchedules,
    getSchedulesByDay,
    getSchedulesAndPostsByUserAndDayAndTime
}
