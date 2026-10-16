import { Schema, models, model } from "mongoose";

const UserS = new Schema(
  {
    email: { type: String, unique: true, lowercase: true, required: true },
    name: String,
    passwordHash: String,
    tokenVersion: { type: Number, default: 0 }, // bump to sign the user out of every device
    // Connected GitHub account. tokenEnc is the user's GitHub token, encrypted at rest; it is never sent to a browser.
    github: {
      login: { type: String, lowercase: true, unique: true, sparse: true }, // lowercase, used in /u/<login>
      handle: String, // the name as GitHub spells it
      name: String,
      avatar: String,
      bio: String,
      tokenEnc: String,
      syncedAt: Date,
    },
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
    website: String, // where visitors can go to use the project
  },
  { timestamps: true }
);
const RepoS = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, index: true },
    ghId: Number,
    name: String,
    fullName: String,
    description: String,
    language: String,
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    url: String,
    homepage: String,
    isPrivate: { type: Boolean, default: false },
    isFork: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    topics: { type: [String], default: [] },
    pushedAt: Date,
    isPublic: { type: Boolean, default: false }, // shown on the owner's public Beacon page
    boardSlug: String, // feedback board created from this repo, if any
  },
  { timestamps: true }
);
RepoS.index({ owner: 1, ghId: 1 }, { unique: true });
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
export const RepoM: any = models.Repo || model("Repo", RepoS);
export const PostM: any = models.Post || model("Post", PostS);
export const CommentM: any = models.Comment || model("Comment", CommentS);
