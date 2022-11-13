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
                data: "Este usuario no tiene horarios de publicación"
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

module.exports = {
    getScheduleByUser
}
