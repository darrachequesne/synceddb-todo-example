import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Sequelize, DataTypes, Op } from "sequelize";

const sequelize = new Sequelize("postgres", "postgres", "changeit", {
  dialect: "postgres",
});

const app = express();

app.use(bodyParser.json());
app.use(cors());

const Todo = sequelize.define("Todo", {
  // createdAt and updatedAt fields are automatically added
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
  },
  completed: {
    type: DataTypes.BOOLEAN,
  },
});

app.get("/todos", async (req, res) => {
  const limit = parseInt(req.query.size, 10);
  const findOptions = {
    order: [
      ["updatedAt", "asc"],
      ["id", "asc"],
    ],
    limit: limit + 1,
  };
  if (req.query.after) {
    const offset = req.query.after.split(",");
    const lastUpdatedAt = new Date(offset[0]);
    const lastUpdatedId = offset[1];
    findOptions.where = {
      [Op.or]: [
        {
          updatedAt: {
            [Op.eq]: lastUpdatedAt,
          },
          id: {
            [Op.gt]: lastUpdatedId,
          },
        },
        {
          updatedAt: {
            [Op.gt]: lastUpdatedAt,
          },
        },
      ],
    };
  }
  const todos = await Todo.findAll(findOptions);
  const hasMore = todos.length > limit;
  if (hasMore) {
    todos.pop();
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      data: todos,
      hasMore,
    })
  );
});

app.post("/todos", async (req, res) => {
  await Todo.create({
    id: req.body.id,
    version: 1,
    title: req.body.title,
    completed: req.body.completed,
  });
  res.writeHead(204).end();
});

app.put("/todos/:id", async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);
  if (!todo) {
    return res.writeHead(404).end();
  }
  if (req.body.version !== todo.version + 1) {
    res.writeHead(409, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(todo));
  }
  await todo.update({
    version: todo.version + 1,
    title: req.body.title,
    completed: req.body.completed,
  });
  res.writeHead(204).end();
});

app.delete("/todos/:id", async (req, res) => {
  const todo = await Todo.findByPk(req.params.id);
  if (!todo) {
    return res.writeHead(404).end();
  }
  await todo.update({
    version: -1,
    title: null,
    completed: null,
  });
  res.writeHead(204).end();
});

const main = async () => {
  await Todo.sync();

  app.listen(3000);
};

main();
