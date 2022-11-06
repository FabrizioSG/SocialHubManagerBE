const bcrypt = require("bcryptjs");
const token = require('basic-auth-token');
const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const {TwitterApi} = require('twitter-api-v2');

const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
})

const T = new TwitterApi({
    appKey:"W0SfhdIFlIEjBAiEuVlNOShIG",
    appSecret:"7mxEw05rtuTQ1GVEqhChsf400mX5WwJm6QYrxXrEyv9Uy4xV4K",
    accessToken:"1589277394107514880-SvQJ9k47tDXGWoYn1fk29l5nDrDz98",
    accessSecret:"z4AIuz8C63BLHUqwvBwvh3u1Lr5JnPjommUzSsjH8opLf",
  });
  
const getUsers = (request, response) => {
    pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const crearTweet = (request, response) => {
    let {texto} = request.body;
    T.v2.tweet(texto).then((val) => {
        return response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: (val)
        });
    }).catch((err) => {
        return response.status(StatusCodes.BAD_REQUEST).json({
            message: ReasonPhrases.BAD_REQUEST,
            data: err
        });
    })
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
            auth = token(results.rows[0].id,results.rows[0].password);
            user = {"data":results.rows[0], "token":auth};
            return response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: (user)
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

    crearTweet,
    getUsers,
    login,
    createUser,
    updateUser,
    deleteUser,
}