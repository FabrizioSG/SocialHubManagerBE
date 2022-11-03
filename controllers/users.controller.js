const bcrypt = require("bcryptjs");
const { ReasonPhrases, StatusCodes } = require("http-status-codes");

const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
})
const getUsers = (request, response) => {
    pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const getUserByEmail = async (email) => {

}

const login = async (request, response) => {

    let { email, password } = request.body;

    // Validar inputs
    if (!(email && password)) {
        return response.status(StatusCodes.BAD_REQUEST).json({
            message: ReasonPhrases.BAD_REQUEST,
            data: "Falta correo o contraseña"
        });
    }

    //Validar existencia de usuario
    pool.query('SELECT * FROM usuarios WHERE email = $1', [email], async (error, results) => {
        if (error) {
            throw error
        }
        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Usuario no existe en la base de datos"
            });
        }
        // Comparar contraseña
        if (await bcrypt.compare(password, results.rows[0].password)) {
            return response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: ("Usuario loggeado",results.rows[0])
            });
        } else {
            return response.status(StatusCodes.UNAUTHORIZED).json({
                message: ReasonPhrases.UNAUTHORIZED,
                data: "Usuario o contraseña incorrecto"
            });
        }
    })



}

const createUser = async (request, response) => {
    let { firstName, lastName, email, password } = request.body

    password = await bcrypt.hash(password, 10);

    pool.query('INSERT INTO usuarios (nombre,apellido, email,password) VALUES ($1, $2, $3,$4)', [firstName, lastName, email, password], (error, results) => {
        if (error) {
            throw error
        }
        response.status(StatusCodes.CREATED).json({
            message: ReasonPhrases.CREATED,
            data: "User created:" + email,
        });
    })
}

const updateUser = (request, response) => {
    const id = parseInt(request.params.id)
    const { name, email } = request.body

    pool.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [name, email, id],
        (error, results) => {
            if (error) {
                throw error
            }
            response.status(200).send(`User modified with ID: ${id}`)
        }
    )
}

const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('DELETE FROM users WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${id}`)
    })
}

module.exports = {
    getUsers,
    login,
    createUser,
    updateUser,
    deleteUser,
}