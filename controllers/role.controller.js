const { sql, pool, poolConnect } = require("../config/db");

exports.createRole = async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    await poolConnect;

    const existed = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .query("SELECT * FROM Roles WHERE name = @name AND isDeleted = 0");

    if (existed.recordset.length > 0) {
      return res.status(400).json({ message: "Role name already exists" });
    }

    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("description", sql.NVarChar, description)
      .query(`
        INSERT INTO Roles(name, description)
        OUTPUT INSERTED.*
        VALUES(@name, @description)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT * FROM Roles
      WHERE isDeleted = 0
      ORDER BY id ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(`
        SELECT * FROM Roles
        WHERE id = @id AND isDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    await poolConnect;

    const checkRole = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Roles WHERE id = @id AND isDeleted = 0");

    if (checkRole.recordset.length === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (name) {
      const existed = await pool
        .request()
        .input("name", sql.NVarChar, name)
        .input("id", sql.Int, id)
        .query(`
          SELECT * FROM Roles
          WHERE name = @name AND id <> @id AND isDeleted = 0
        `);

      if (existed.recordset.length > 0) {
        return res.status(400).json({ message: "Role name already exists" });
      }
    }

    const current = checkRole.recordset[0];

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar, name ?? current.name)
      .input("description", sql.NVarChar, description ?? current.description)
      .query(`
        UPDATE Roles
        SET name = @name,
            description = @description,
            updatedAt = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(`
        UPDATE Roles
        SET isDeleted = 1,
            updatedAt = GETDATE()
        WHERE id = @id AND isDeleted = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json({ message: "Role soft deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUsersByRoleId = async (req, res) => {
  try {
    await poolConnect;

    const { id } = req.params;

    const roleResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT * FROM Roles
        WHERE id = @id AND isDeleted = 0
      `);

    if (roleResult.recordset.length === 0) {
      return res.status(404).json({ message: "Role not found" });
    }

    const usersResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT
          id, username, email, fullName, avatarUrl, status,
          roleId, loginCount, createdAt, updatedAt
        FROM Users
        WHERE roleId = @id AND isDeleted = 0
        ORDER BY id ASC
      `);

    res.json({
      role: roleResult.recordset[0],
      users: usersResult.recordset,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};