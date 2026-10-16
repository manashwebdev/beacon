import { Schema, models, model } from "mongoose";

const UserS = new Schema(
  {
    email: { type: String, unique: true, lowercase: true, required: true },
    name: String,
    passwordHash: String,
    tokenVersion: { type: Number, default: 0 }, // bump to sign the user out of every device
  },
  { timestamps: true }
);
const ProjectS = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, index: true },
    members: {
      type: [new Schema({ user: { type: Schema.Types.ObjectId, index: true }, role: { type: String, enum: ["admin", "editor", "viewer"] } }, { _id: false })],
      default: [],
    },
    name: String,
    slug: { type: String, unique: true },
    description: String,
  },
  { timestamps: true }
);
const PostS = new Schema(
  {
    project: { type: Schema.Types.ObjectId, index: true },
    title: String,
    body: String,
    author: String,
    status: { type: String, enum: ["open", "planned", "progress", "shipped"], default: "open" },
    voters: { type: [String], default: [] },
    reply: String,
    shippedAt: Date,
  },
  { timestamps: true }
);
const CommentS = new Schema(
  { post: { type: Schema.Types.ObjectId, index: true }, author: String, body: String, byOwner: Boolean },
  { timestamps: true }
);

export const UserM: any = models.User || model("User", UserS);
export const ProjectM: any = models.Project || model("Project", ProjectS);
export const PostM: any = models.Post || model("Post", PostS);
export const CommentM: any = models.Comment || model("Comment", CommentS);
